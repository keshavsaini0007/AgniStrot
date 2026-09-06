import { Schema, model } from "mongoose";
import type { IAlert } from "../types/index.js";

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

const Alert = model<IAlert>("Alert", alertSchema);

export default Alert;
