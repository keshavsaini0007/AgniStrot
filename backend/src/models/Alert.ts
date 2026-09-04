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
      required: [true, "sourceId is required."],
      // points to the exact inspection/incident/attendance record that triggered this alert
      // this is how every alert stays traceable — no black-box detection (PRD FR6 + NFR Explainability)
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

const Alert = model<IAlert>("Alert", alertSchema);

export default Alert;
