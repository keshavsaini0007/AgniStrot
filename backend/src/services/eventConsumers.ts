import { Types, type Model } from "mongoose";
import type { IOutboxEvent } from "../types/index.js";
import Incident from "../models/Incident.js";
import Inspection from "../models/Inspection.js";
import Attendance from "../models/Attendance.js";
import { evaluateRules } from "./ruleEngine.js";
import { logAction } from "./auditLogger.js";
import { emitRecordEvent } from "../sockets/index.js";

// ── Event Consumers ───────────────────────────────────────────────────────────
// Each handler MUST be idempotent — the outbox worker may re-deliver an event
// after a crash (edge B). Safety properties:
//   - Alerts: created via ruleKey-unique upsert (first run inserts, replays no-op)
//   - Audit:  logAction(..., dedupeKey = event.eventKey) → duplicate-key E11000
//             is swallowed, so a replay never double-logs
//   - Socket: emissions are last-write-wins; re-sending is harmless
//   - Edge E: every handler verifies the referenced entity still exists before
//             creating any side-effects

// ── Entity-existence guard (edge E) ──────────────────────────────────────────

async function ensureEntityExists(
  model: Model<any>,
  id: Types.ObjectId,
  label: string
): Promise<boolean> {
  const exists = await model.exists({ _id: id });
  if (!exists) {
    console.warn(
      `[eventConsumers] ${label} ${id.toString()} no longer exists — dropping ${label} event without side-effects.`
    );
  }
  return !!exists;
}

// ── INCIDENT_CREATED ─────────────────────────────────────────────────────────

async function handleIncidentCreated(event: IOutboxEvent): Promise<void> {
  if (!(await ensureEntityExists(Incident, event.aggregateId, "incident"))) return;

  const incident = await Incident.findById(event.aggregateId).lean();
  if (!incident) return;

  const siteId = event.siteId ?? incident.siteId;
  const entityId = event.aggregateId;

  // Live dashboard update (replaces the inline emit that lived in the sync
  // controller — now durable and crash-safe).
  emitRecordEvent("incident", siteId.toString(), {
    recordId: entityId.toString(),
    siteId: siteId.toString(),
    severity: incident.severity,
    category: incident.category,
    capturedAt: incident.capturedAt,
  });

  // Idempotent audit entry (B): dedupe on the event key.
  await logAction({
    entityType: "incident",
    entityId,
    action: "created",
    ...(event.actorId ? { actorId: event.actorId } : {}),
    payload: {
      siteId: siteId.toString(),
      severity: incident.severity,
      category: incident.category,
      description: incident.description,
      workerRef: null,
    },
    dedupeKey: event.eventKey,
  });

  // Rule evaluation → alerts (ruleKey-unique upsert keeps it idempotent).
  await evaluateRules("incident", entityId, siteId, incident as unknown as Record<string, unknown>);
}

// ── INSPECTION_CREATED ───────────────────────────────────────────────────────

async function handleInspectionCreated(event: IOutboxEvent): Promise<void> {
  if (!(await ensureEntityExists(Inspection, event.aggregateId, "inspection"))) return;

  const inspection = await Inspection.findById(event.aggregateId).lean();
  if (!inspection) return;

  const siteId = event.siteId ?? inspection.siteId;
  const entityId = event.aggregateId;

  emitRecordEvent("inspection", siteId.toString(), {
    recordId: entityId.toString(),
    siteId: siteId.toString(),
    type: inspection.type,
    capturedAt: inspection.capturedAt,
  });

  await logAction({
    entityType: "inspection",
    entityId,
    action: "created",
    ...(event.actorId ? { actorId: event.actorId } : {}),
    payload: {
      siteId: siteId.toString(),
      type: inspection.type,
      checklist: inspection.checklist,
    },
    dedupeKey: event.eventKey,
  });

  await evaluateRules("inspection", entityId, siteId, inspection as unknown as Record<string, unknown>);
}

// ── ATTENDANCE_SYNCED ────────────────────────────────────────────────────────

async function handleAttendanceSynced(event: IOutboxEvent): Promise<void> {
  if (!(await ensureEntityExists(Attendance, event.aggregateId, "attendance"))) return;

  const attendance = await Attendance.findById(event.aggregateId).lean();
  if (!attendance) return;

  const siteId = event.siteId ?? attendance.siteId;
  const entityId = event.aggregateId;

  emitRecordEvent("attendance", siteId.toString(), {
    recordId: entityId.toString(),
    siteId: siteId.toString(),
    workerRef: attendance.workerRef,
    checkType: attendance.checkType,
    capturedAt: attendance.capturedAt,
  });

  await logAction({
    entityType: "attendance",
    entityId,
    action: "created",
    ...(event.actorId ? { actorId: event.actorId } : {}),
    payload: {
      siteId: siteId.toString(),
      workerRef: attendance.workerRef,
      checkType: attendance.checkType,
    },
    dedupeKey: event.eventKey,
  });

  // No sync rules for attendance (ruleEngine returns [] (records are
  // aggregated by the batch cron instead) — nothing further to do.
}

// ── DOCUMENT_UPLOADED ────────────────────────────────────────────────────────

async function handleDocumentUploaded(event: IOutboxEvent): Promise<void> {
  // Documents are audit-logged at ingest already; this consumer exists so
  // document events flow through the same durable pipeline (future consumers:
  // OCR re-run on low confidence, evidence-hash verification, notifications).
  await logAction({
    entityType: "document",
    entityId: event.aggregateId,
    action: "uploaded",
    ...(event.actorId ? { actorId: event.actorId } : {}),
    payload: (event.payload as Record<string, unknown> | null) ?? {
      siteId: event.siteId?.toString() ?? null,
    },
    dedupeKey: event.eventKey,
  });
}

// ── Dispatch ─────────────────────────────────────────────────────────────────
// Unknown event type → throw → the worker retries → DLQ. Misconfigured events
// surface visibly instead of vanishing silently.

export async function dispatchEvent(event: IOutboxEvent): Promise<void> {
  switch (event.type) {
    case "INCIDENT_CREATED":
      return handleIncidentCreated(event);
    case "INSPECTION_CREATED":
      return handleInspectionCreated(event);
    case "ATTENDANCE_SYNCED":
      return handleAttendanceSynced(event);
    case "DOCUMENT_UPLOADED":
      return handleDocumentUploaded(event);
    default:
      throw new Error(`No consumer registered for event type "${event.type}"`);
  }
}