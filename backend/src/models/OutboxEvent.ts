import { Schema, model } from "mongoose";
import type { IOutboxEvent } from "../types/index.js";

// ── Outbox Event Model ────────────────────────────────────────────────────────
// The durable event store of the event-driven architecture.
//
//   Action → Transaction { Business Data + OutboxEvent } → Worker → Consumers
//
// Reliability properties (each maps to an edge case):
//   A. Duplicate event (double-click, retry, restart)
//        → eventKey UNIQUE index; emit is an upsert, so re-emits are no-ops.
//   B. Worker crashes after processing before marking complete
//        → two-phase claim (pending → processing → completed) + stale-lease
//          recovery; consumers are idempotent so re-delivery is safe.
//   C. Repeated failures
//        → retryCount / maxRetries / lastError / nextAttemptAt with backoff;
//          exhausted events move to the FailedJob (DLQ) collection.
//   D. Ordering
//        → sequenceNumber per aggregate (assigned at emit); the worker holds
//          an event while an earlier sibling of the same aggregate is pending.

const outboxEventSchema = new Schema<IOutboxEvent>(
  {
    eventKey: {
      type: String,
      required: [true, "eventKey is required."],
      // dedup key: "<aggregateType>:<aggregateId>:<type>"
      // UNIQUE enforced by the explicit index below — declaring it on the field
      // AND via schema.index() would duplicate the definition (mongoose warns).
    },
    type: {
      type: String,
      required: [true, "Event type is required."],
      // EventType union value (documented in types/index.ts)
    },
    aggregateType: {
      type: String,
      required: [true, "aggregateType is required."],
      // 'inspection' | 'incident' | 'attendance' | 'document' | 'alert' ...
    },
    aggregateId: {
      type: Schema.Types.ObjectId,
      required: [true, "aggregateId is required."],
      // the _id of the business record this event refers to
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      default: null,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // who caused the event; null = system-triggered (cron, worker)
    },
    sequenceNumber: {
      type: Number,
      required: [true, "sequenceNumber is required."],
      default: 1,
      // per-aggregate monotonic counter assigned at emit time (count + 1)
    },
    payload: {
      type: Schema.Types.Mixed,
      default: null,
      // immutable snapshot of the relevant data when the event was emitted
    },
    status: {
      type: String,
      required: [true, "status is required."],
      default: "pending",
      enum: {
        values: ["pending", "processing", "completed", "failed", "dead"],
        message: "{VALUE} is not a valid outbox status.",
      },
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
      // attempts past this many *after the first* are routed to the DLQ
    },
    lastError: {
      type: String,
      default: null,
      // truncated error message from the most recent failed attempt
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
      // worker only picks events with nextAttemptAt <= now (backoff support)
    },
    processingStartedAt: {
      type: Date,
      default: null,
      // set when a worker claims the event; used for stale-lease recovery
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
// eventKey: UNIQUE — duplicate-event prevention (edge A).
outboxEventSchema.index({ eventKey: 1 }, { unique: true });

// Worker pick query: "pending events due now, oldest first" (edge G — cheap scan)
outboxEventSchema.index({ status: 1, nextAttemptAt: 1 });

// Ordering (edge D): "is an earlier event for this aggregate still incomplete?"
outboxEventSchema.index({ aggregateType: 1, aggregateId: 1, sequenceNumber: 1 });

const OutboxEvent = model<IOutboxEvent>("OutboxEvent", outboxEventSchema);

export default OutboxEvent;