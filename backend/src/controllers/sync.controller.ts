import type { Request, Response } from "express";
import { Types, type Model } from "mongoose";
import type { ZodSchema } from "zod";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import Attendance from "../models/Attendance.js";
import Site from "../models/Site.js";
import { isPointWithinBoundary, type GeoRingPoint } from "../utils/geometry.js";
import {
  emitOutboxEvent,
  processOutboxEvents,
  runInTransaction,
  sessionOption,
} from "../services/outboxService.js";
import {
  inspectionRecordSchema,
  incidentRecordSchema,
  attendanceRecordSchema,
} from "../validators/sync.validator.js";
import type { EventType, SourceType } from "../types/index.js";

// ── Sync controller (event-driven) ───────────────────────────────────────────
// Each accepted record is written inside a MongoDB transaction together with
// its OutboxEvent (Transactional Outbox — edge F). The outbox worker then
// consumes the event durably:
//
//   Transaction { Sync Record + OutboxEvent } → Worker → Socket / Audit / Rules
//
// What used to run inline here (socket emit, audit log, rule engine) now runs
// in the consumers (services/eventConsumers.ts) — crash-safe and replay-safe.

type SyncResult = {
  accepted: string[];
  rejected: { clientUuid: string; reason: string }[];
};

// Map sync source → domain event emitted on insert.
const EVENT_TYPE_BY_SOURCE: Record<SourceType, EventType> = {
  inspection: "INSPECTION_CREATED",
  incident: "INCIDENT_CREATED",
  attendance: "ATTENDANCE_SYNCED",
};

// ── Geofencing ────────────────────────────────────────────────────────────────
// Sites may define a `boundary` ring (stored on the Site document). Every sync
// record that carries coordinates is checked against its target site's ring —
// an out-of-bounds capture is rejected per-record (reason GEOFENCE_VIOLATION)
// and never written. Sites without a boundary are unenforced (backward compat).

interface GeofenceSite {
  name: string;
  boundary: GeoRingPoint[] | null;
}

async function loadSiteBoundaries(
  siteIds: string[]
): Promise<Map<string, GeofenceSite>> {
  const map = new Map<string, GeofenceSite>();
  if (siteIds.length === 0) return map;
  const sites = await Site.find({ _id: { $in: siteIds } })
    .select("name boundary")
    .lean();
  for (const s of sites) {
    map.set((s._id as unknown as Types.ObjectId).toString(), {
      name: s.name,
      boundary: (s.boundary as unknown as GeoRingPoint[] | undefined) ?? null,
    });
  }
  return map;
}

function collectSiteIds(records: unknown[]): string[] {
  const ids = new Set<string>();
  for (const raw of records) {
    const siteId = (raw as Record<string, unknown>)?.siteId;
    if (typeof siteId === "string") ids.add(siteId);
  }
  return [...ids];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function processRecord(
  rawRecord: unknown,
  schema: ZodSchema,
  buildSafeDoc: (validated: Record<string, unknown>, userId: string) => Record<string, unknown>,
  Model: Model<any>,
  sourceType: SourceType,
  userId: string,
  geofences: Map<string, GeofenceSite>,
  results: SyncResult
): Promise<void> {
  // Step 1: validate record shape
  const parsed = schema.safeParse(rawRecord);
  if (!parsed.success) {
    const uuid = (rawRecord as Record<string, unknown>)?.clientUuid;
    const reason = parsed.error.issues[0]?.message ?? "invalid record";
    results.rejected.push({
      clientUuid: typeof uuid === "string" ? uuid : "unknown",
      reason,
    });
    return;
  }

  const validated = parsed.data as Record<string, unknown>;
  const uuid = validated.clientUuid as string;

  // Step 2: geofence containment — rejects out-of-bounds captures BEFORE the
  // transactional write, so a violation never touches the entity/outbox.
  const location = validated.location as { lat: number; lng: number } | undefined;
  if (location) {
    const site = geofences.get(validated.siteId as string);
    if (
      site?.boundary &&
      site.boundary.length >= 3 &&
      !isPointWithinBoundary(location, site.boundary)
    ) {
      results.rejected.push({
        clientUuid: uuid,
        reason: `GEOFENCE_VIOLATION: outside ${site.name} boundary`,
      });
      return;
    }
  }

  // Step 3: build the safe document — only whitelisted fields, server-set values override client
  const safeDoc = buildSafeDoc(validated, userId);
  const siteId = new Types.ObjectId(validated.siteId as string);

  // Step 4: transactional outbox (edges A + F) — entity + event commit together.
  await runInTransaction(async (session) => {
    const result: any = await Model.findOneAndUpdate(
      { clientUuid: uuid },
      { $setOnInsert: safeDoc },
      {
        upsert: true,
        returnDocument: "after",
        includeResultMetadata: true,
        ...sessionOption(session),
      }
    );

    if (result.lastErrorObject?.upserted) {
      // New document inserted — write its domain event into the durable outbox.
      results.accepted.push(uuid);
      const doc = result.value as { _id: Types.ObjectId };
      await emitOutboxEvent(
        {
          type: EVENT_TYPE_BY_SOURCE[sourceType],
          aggregateType: sourceType,
          aggregateId: doc._id,
          siteId,
          actorId: new Types.ObjectId(userId),
          payload: safeDoc,
        },
        session
      );
    } else {
      // clientUuid already exists → duplicate, no event emitted (idempotent sync)
      results.rejected.push({ clientUuid: uuid, reason: "duplicate" });
    }
  });
}

// ── Kick the outbox worker so consumers run immediately, not just on the
// server's poll interval. Safe to call concurrently: events are claimed
// atomically (status: pending → processing).

function kickOutboxWorker(): void {
  void processOutboxEvents().catch((err) => {
    console.error("[outbox] Worker kick failed:", err);
  });
}

// ── POST /api/v1/inspections/sync ───────────────────────────────────────────

export const syncInspections = async (req: Request, res: Response): Promise<void> => {
  try {
    const { records } = req.body as { records: unknown[] };
    const userId = req.user!.id;
    const results: SyncResult = { accepted: [], rejected: [] };
    const geofences = await loadSiteBoundaries(collectSiteIds(records));

    for (const raw of records) {
      await processRecord(
        raw,
        inspectionRecordSchema,
        (v, uid) => ({
          clientUuid:  v.clientUuid,
          siteId:      new Types.ObjectId(v.siteId as string),
          inspectorId: new Types.ObjectId(uid),
          type:        v.type,
          checklist:   v.checklist,
          location:    v.location ?? null,
          photoUrls:   v.photoUrls ?? [],
          capturedAt:  v.capturedAt,
          syncedAt:    new Date(),
        }),
        Inspection,
        "inspection",
        userId,
        geofences,
        results
      );
    }

    kickOutboxWorker();
    res.json(results);
  } catch (err) {
    console.error("Sync inspections error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/incidents/sync ─────────────────────────────────────────────

export const syncIncidents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { records } = req.body as { records: unknown[] };
    const userId = req.user!.id;
    const results: SyncResult = { accepted: [], rejected: [] };
    const geofences = await loadSiteBoundaries(collectSiteIds(records));

    for (const raw of records) {
      await processRecord(
        raw,
        incidentRecordSchema,
        (v, uid) => ({
          clientUuid:  v.clientUuid,
          siteId:      new Types.ObjectId(v.siteId as string),
          reportedBy:  new Types.ObjectId(uid),
          severity:    v.severity,
          category:    v.category,
          description: v.description,
          location:    v.location ?? null,
          photoUrls:   v.photoUrls ?? [],
          capturedAt:  v.capturedAt,
          syncedAt:    new Date(),
          status:      "open",
        }),
        Incident,
        "incident",
        userId,
        geofences,
        results
      );
    }

    kickOutboxWorker();
    res.json(results);
  } catch (err) {
    console.error("Sync incidents error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/attendance/sync ────────────────────────────────────────────

export const syncAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { records } = req.body as { records: unknown[] };
    const userId = req.user!.id;
    const results: SyncResult = { accepted: [], rejected: [] };
    const geofences = await loadSiteBoundaries(collectSiteIds(records));

    for (const raw of records) {
      await processRecord(
        raw,
        attendanceRecordSchema,
        (v, _uid) => ({
          clientUuid: v.clientUuid,
          siteId:     new Types.ObjectId(v.siteId as string),
          workerRef:  v.workerRef,
          checkType:  v.checkType,
          location:   v.location ?? null,
          capturedAt: v.capturedAt,
          syncedAt:   new Date(),
        }),
        Attendance,
        "attendance",
        userId,
        geofences,
        results
      );
    }

    kickOutboxWorker();
    res.json(results);
  } catch (err) {
    console.error("Sync attendance error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};