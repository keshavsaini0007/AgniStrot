import { Schema, model } from "mongoose";
import type { IAlert, ISlaSnapshot, IEscalationLevel } from "../types/index.js";

// ── Feature 02: SLA / escalation snapshot sub-schemas ───────────────────────
// Captured on the alert at creation time (edge G) so the engine reads the
// policies as they were when the alert was raised — policy edits never
// retroactively move existing alerts' deadlines.

const escalationLevelSchema = new Schema<IEscalationLevel>(
  {
    level: { type: Number, required: [true, "level is required."], min: 1 },
    role: {
      type: String,
      required: [true, "role is required."],
      enum: {
        values: ["mine_official", "corporate_manager", "regulator"],
        message: "{VALUE} is not a valid escalation role.",
      },
    },
    waitMinutes: {
      type: Number,
      required: [true, "waitMinutes is required."],
      min: [1, "waitMinutes must be positive."],
    },
  },
  { _id: false }
);

const slaSnapshotSchema = new Schema<ISlaSnapshot>(
  {
    ackSla: { type: Number, required: [true, "ackSla is required."], min: 1 },
    resolutionSla: { type: Number, required: [true, "resolutionSla is required."], min: 1 },
    escalationChain: {
      type: [escalationLevelSchema],
      required: [true, "escalationChain is required."],
    },
  },
  { _id: false }
);

// ── Feature 04: recurrence evidence sub-schema ───────────────────────────────
// One source record (failed inspection item / incident) that contributed to a
// RECURRING_HAZARD pattern. Identity snapshot only — the source documents live
// in Inspection/Incident and may be deleted later; evidence never guarantees
// referential integrity.

const alertEvidenceSchema = new Schema(
  {
    sourceType: {
      type: String,
      required: [true, "sourceType is required."],
      enum: {
        values: ["inspection", "incident", "attendance"],
        message: "{VALUE} is not a valid source type.",
      },
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: [true, "sourceId is required."],
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      // inspectorId for inspections, reportedBy for incidents — used to count
      // unique reporters (edge case D: 3/3 is stronger evidence than 3/1).
    },
    capturedAt: {
      type: Date,
      required: [true, "capturedAt is required."],
    },
  },
  { _id: false }
);

const alertSchema = new Schema<IAlert>(
  {
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "siteId is required."],
    },
    sourceType: {
      type: String,
      required: [true, "sourceType is required."],
      enum: {
        values: ["inspection", "incident", "attendance"],
        message: "{VALUE} is not a valid source type.",
      },
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      // points to the exact inspection/incident/attendance record that triggered this alert
      // this is how every sync alert stays traceable — no black-box detection (PRD FR6)
      // undefined for batch/synthetic alerts (overdue/anomaly) — they derive from absence,
      // and ruleKey identifies them instead.
    },
    ruleKey: {
      type: String,
      required: [true, "ruleKey is required."],
      // universal dedup key — present on EVERY alert:
      //   sync alerts:  "sync:<sourceId>:<ruleCode>" (idempotent re-evaluation)
      //   batch alerts: "overdue:siteId:type", "anomaly:siteId:date", "repeat:siteId:ruleCode"
      // Backed by the unique ruleKey_1 index — the DB-level dedup guarantee.
    },
    ruleCode: {
      type: String,
      required: [true, "ruleCode is required."],
      enum: {
        values: [
          "SAFETY_CHECKLIST_FAIL",
          "CRITICAL_INCIDENT",
          "MISSING_MANDATORY_FIELD",
          "REPEAT_VIOLATION",
          "OVERDUE_INSPECTION",
          "ATTENDANCE_ANOMALY",
          "RECURRING_HAZARD",
        ],
        message: "{VALUE} is not a recognised rule code.",
      },
    },
    severity: {
      type: String,
      required: [true, "severity is required."],
      enum: {
        values: ["low", "medium", "high", "critical"],
        message: "{VALUE} is not a valid severity.",
      },
    },
    status: {
      type: String,
      default: "open",
      enum: {
        values: ["open", "acknowledged", "escalated", "closed"],
        message: "{VALUE} is not a valid alert status.",
      },
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "assignedTo is required."],
      // always the mine_official for that site — set by alertService at creation time
    },
    resolvedAt: {
      type: Date,
      // Set when status changes to "closed"
    },
    slaSnapshot: {
      type: slaSnapshotSchema,
      required: [true, "slaSnapshot is required."],
    },
    ackDeadline: { type: Date, default: null },
    resolutionDeadline: { type: Date, default: null },
    currentLevel: { type: Number, default: 1, min: 1 },
    escalationCount: { type: Number, default: 0, min: 0 },
    lastEscalatedAt: { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },
    assignedRole: {
      // role responsible at the current rung — mirrors chain[currentLevel - 1]
      // so the UI can render the ladder without re-deriving it
      type: String,
      enum: {
        values: ["mine_official", "corporate_manager", "regulator"],
        message: "{VALUE} is not a valid escalation role.",
      },
      default: null,
    },
    department: {
      type: String,
      default: "operations",
      enum: {
        values: ["safety", "production", "environmental", "labour", "operations"],
        message: "{VALUE} is not a valid department.",
      },
    },
    // ── Feature 04: Recurring Problem Detection fields ───────────────────────
    category: {
      type: String,
      // canonical hazard category key — set on RECURRING_HAZARD alerts only;
      // used to find the open/unresolved generation of a pattern (edge A).
    },
    scope: {
      type: String,
      enum: {
        values: ["localized", "site-wide", "category-wide"],
        message: "{VALUE} is not a valid recurrence scope.",
      },
    },
    evidence: {
      type: [alertEvidenceSchema],
      default: undefined,
    },
    reportCount: { type: Number, min: 0 },
    uniqueReporters: { type: Number, min: 0 },
    reinforcedCount: { type: Number, default: 0, min: 0 },
    zoneCount: { type: Number, min: 0 },
    sitesAffected: { type: Number, min: 0 },
    firstReportedAt: { type: Date },
    lastReportedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Mine official dashboard: "all open alerts at my site"
alertSchema.index({ siteId: 1, status: 1 });

// Corporate manager dashboard: "all critical alerts across all sites"
alertSchema.index({ severity: 1, status: 1 });

// Workflow engine: "find alerts that are overdue and not yet escalated"
alertSchema.index({ status: 1, createdAt: 1 });

// Query help: find alerts by source record + rule (sync dedup filter uses ruleKey)
// NOTE: deliberately NOT unique — Mongo indexes missing fields as null on sparse
// unique indexes, so a unique {sourceId, ruleCode} would collide batch alerts
// (which have no sourceId). Unique dedup lives on ruleKey_1 instead.
alertSchema.index({ sourceId: 1, ruleCode: 1 });

// Universal dedup index — sync (sync:sourceId:ruleCode) + batch (derived keys).
// Unique: no sparse needed — ruleKey is present on every alert.
alertSchema.index({ ruleKey: 1 }, { unique: true });

// Feature 04: find the current (open/closed) generation of a hazard pattern at
// a site — REPEAT vs UNRESOLVED resolution (edge case A).
alertSchema.index({ siteId: 1, category: 1 });

const Alert = model<IAlert>("Alert", alertSchema);

export default Alert;
