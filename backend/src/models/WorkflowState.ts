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
      // calculated from ALERT_DEADLINES in types/index.ts based on alert severity:
      // critical = now + 2h, high = now + 24h, medium = now + 3d, low = now + 7d
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
