import type { Request, Response } from "express";
import { Types } from "mongoose";
import type { Model } from "mongoose";
import type { ZodSchema } from "zod";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import Attendance from "../models/Attendance.js";
import { evaluateRules } from "../services/ruleEngine.js";
import { logAction } from "../services/auditLogger.js";
import { syncBatchSchema } from "../validators/sync.validator.js";
import {
  inspectionRecordSchema,
  incidentRecordSchema,
  attendanceRecordSchema,
} from "../validators/sync.validator.js";
import type { SourceType } from "../types/index.js";

// ── Sync helper ──────────────────────────────────────────────────────────────
// Generic per-record processor. Validates each record individually so invalid
// records go to rejected[] without failing the entire batch.

type SyncResult = {
  accepted: string[];
  rejected: { clientUuid: string; reason: string }[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */
async function processRecord(
  rawRecord: unknown,
  schema: ZodSchema,
  buildSafeDoc: (validated: Record<string, unknown>, userId: string) => Record<string, unknown>,
  Model: Model<any>,
  sourceType: SourceType,
  userId: string,
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

  // Step 2: build the safe document — only whitelisted fields, server-set values override client
  const safeDoc = buildSafeDoc(validated, userId);

  // Step 3: atomic upsert — insert if new, skip if clientUuid already exists
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const result: any = await Model.findOneAndUpdate(
    { clientUuid: uuid },
    { $setOnInsert: safeDoc },
    { upsert: true, new: true, includeResultMetadata: true }
  );

  if (result.lastErrorObject?.upserted) {
    // New document inserted — trigger rule engine
    results.accepted.push(uuid);
    try {
      const doc = result.value as { _id: Types.ObjectId } | undefined;
      if (doc) {
        const siteId = new Types.ObjectId(validated.siteId as string);
        await logAction({
          entityType: sourceType,
          entityId: doc._id,
          action: "created",
          actorId: new Types.ObjectId(userId),
          payload: {
            siteId: validated.siteId,
            type: validated.type,
            severity: validated.severity,
            category: validated.category,
            workerRef: validated.workerRef,
            checkType: validated.checkType,
          },
        });
        await evaluateRules(sourceType, doc._id, siteId, safeDoc);
      }
    } catch (ruleErr) {
      console.error(`Rule engine error for ${sourceType} ${uuid}:`, ruleErr);
    }
  } else {
    results.rejected.push({ clientUuid: uuid, reason: "duplicate" });
  }
}

// ── POST /api/v1/inspections/sync ───────────────────────────────────────────

export const syncInspections = async (req: Request, res: Response): Promise<void> => {
  try {
    const { records } = req.body as { records: unknown[] };
    const userId = req.user!.id;
    const results: SyncResult = { accepted: [], rejected: [] };

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
        results
      );
    }

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
        results
      );
    }

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
        }),
        Attendance,
        "attendance",
        userId,
        results
      );
    }

    res.json(results);
  } catch (err) {
    console.error("Sync attendance error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
