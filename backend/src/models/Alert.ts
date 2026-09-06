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
      // batch/synthetic alerts only — lets idempotent re-firing per site-type-day
      // without needing a real source record. Sync alerts leave this undefined.
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

// Dedup safety net: one alert per (source record + rule) combination
// Sparse: batch alerts (no sourceId) are excluded and dedupe on ruleKey instead.
// This is the DB-level guarantee — application-level atomic upsert is the first line of defence
alertSchema.index({ sourceId: 1, ruleCode: 1 }, { unique: true, sparse: true });

// Batch alerts (overdue/anomaly) have no source record — dedupe on ruleKey instead.
// Sparse: sync alerts (no ruleKey) are excluded from the unique constraint.
alertSchema.index({ ruleKey: 1 }, { unique: true, sparse: true });

const Alert = model<IAlert>("Alert", alertSchema);

export default Alert;
