import { Schema, model } from "mongoose";
import type { IWorkflowState } from "../types/index.js";

const workflowStateSchema = new Schema<IWorkflowState>(
  {
    alertId: {
      type: Schema.Types.ObjectId,
      ref: "Alert",
      required: [true, "alertId is required."],
    },
    state: {
      type: String,
      required: [true, "state is required."],
      enum: {
        values: ["assigned", "reminded", "acknowledged", "escalated", "resolved"],
        message: "{VALUE} is not a valid workflow state.",
      },
    },
    deadline: {
      type: Date,
      required: [true, "deadline is required."],
      // Due time for the rung this row represents. Level 1 is stamped at creation
      // from the alert's slaSnapshot chain (feature 02) — falling back to the
      // legacy ALERT_DEADLINES constants when a legacy alert has no snapshot.
    },
    level: {
      type: Number,
      required: [true, "level is required."],
      default: 1,
      min: 1,
      // The alert.currentLevel this transition was written for. Lets per-level
      // escalation rows coexist (reminded@1, escalated@2, escalated@3 …) so a
      // multi-level climb is fully auditable and each rung dedupes on its own
      // outbox eventKey. Legacy rows read back as 1.
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // null = system-triggered (cron escalation)
      // set = a user manually acknowledged or resolved the alert
    },
    note: {
      type: String,
      default: null,
      // free-text attached to the transition (acknowledge note, resolutionNote) —
      // persistence makes the derived corrective-actions feed history complete.
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Workflow engine cron query: "find the latest state for each alert
// where deadline has passed and state is not yet escalated" — per-alert history
workflowStateSchema.index({ alertId: 1, changedAt: -1 });

// Escalation aggregate: match assigned/reminded first, then sort by changedAt.
// The $match collapses the working set to actionable rows and the index supplies
// changedAt order — no unbounded in-memory sort over the full history.
workflowStateSchema.index({ state: 1, changedAt: -1 });

const WorkflowState = model<IWorkflowState>("WorkflowState", workflowStateSchema);

export default WorkflowState;
