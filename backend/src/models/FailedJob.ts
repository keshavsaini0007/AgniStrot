import { Schema, model } from "mongoose";
import type { IFailedJob } from "../types/index.js";

// ── Failed Job (Dead Letter Queue) Model ─────────────────────────────────────
// Failed background jobs must never silently disappear. When an outbox event
// exhausts its retries (edge C), a record lands here so an admin can see,
// reprocess, or discard it.
//
//   Job → Processing → Failed → Retry 1..3 → Dead Letter Queue

const failedJobSchema = new Schema<IFailedJob>(
  {
    jobType: {
      type: String,
      required: [true, "jobType is required."],
      // the event type that exhausted its retries, e.g. 'INCIDENT_CREATED'
    },
    payload: {
      type: Schema.Types.Mixed,
      default: null,
      // snapshot of the event payload at failure time — enough to reprocess
    },
    error: {
      type: String,
      required: [true, "error is required."],
      // last error message that kept failing
    },
    attempts: {
      type: Number,
      required: [true, "attempts is required."],
      // total attempts before landing here
    },
    firstFailedAt: {
      type: Date,
      default: Date.now,
    },
    lastFailedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      default: "failed",
      enum: {
        values: ["failed", "reprocessed", "discarded"],
        message: "{VALUE} is not a valid failed-job status.",
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
// Admin queue: "show me failed jobs, newest first"
failedJobSchema.index({ status: 1, createdAt: -1 });

const FailedJob = model<IFailedJob>("FailedJob", failedJobSchema);

export default FailedJob;