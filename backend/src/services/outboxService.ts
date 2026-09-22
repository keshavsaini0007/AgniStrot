import mongoose, { Types, type ClientSession } from "mongoose";
import OutboxEvent from "../models/OutboxEvent.js";
import FailedJob from "../models/FailedJob.js";
import { dispatchEvent } from "./eventConsumers.js";
import type {
  AggregateType,
  EventType,
  IOutboxEvent,
  OutboxStatus,
} from "../types/index.js";

// ── Outbox Service ───────────────────────────────────────────────────────────
// The durable event store + worker of the event-driven architecture.
//
//   Action → Transaction { Business Data + OutboxEvent } → Worker → Consumers
//                                                                   ↓
//                                                              FailedJob (DLQ)
//
// Edge cases handled here:
//   A. Duplicate events  → eventKey unique index + $setOnInsert upsert
//   B. Crash mid-flight  → two-phase claim + stale-lease recovery (idempotent
//                          consumers make re-delivery safe)
//   C. Repeat failures   → retryCount/maxRetries/lastError/nextAttemptAt →
//                          Dead Letter Queue
//   D. Ordering          → sequenceNumber per aggregate; workers hold events
//                          whose earlier sibling is still incomplete
//   F. Entity written but event lost → Transactional Outbox (MongoDB tx)
//   G. Worker overload   → bounded batches (default 50) + pick indexes

// ── Config (overridable via env, sweet defaults for the prototype) ──────────

export const OUTBOX_BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE ?? 50);
export const OUTBOX_MAX_RETRIES = Number(process.env.OUTBOX_MAX_RETRIES ?? 3);
export const OUTBOX_LEASE_MS = Number(process.env.OUTBOX_LEASE_MS ?? 5 * 60 * 1000);
const BACKOFF_BASE_MS = 30_000; // 30s, 60s, 60s cap — exponential
const BACKOFF_CAP_MS = 60_000;
const ORDERING_HOLD_MS = 30_000;

// ── Session option helper ────────────────────────────────────────────────────
// With `exactOptionalPropertyTypes`, passing `session: undefined` to an
// optional mongoose option fails type checking. Spread this instead so the key
// is omitted entirely when there is no session.

export function sessionOption(
  session?: ClientSession | null
): { session: ClientSession } | Record<string, never> {
  return session ? { session } : {};
}

// ── Transaction helper (edge F) ──────────────────────────────────────────────
// Primary path: MongoDB transaction so the business write and its outbox event
// commit atomically. Standalone mongod does NOT support transactions — in that
// case we log once and fall back to a non-transactional run (the eventKey
// unique index still prevents duplicates; the entity-then-event order means a
// crash between the two leaves an entity without an event — a known caveat of
// the fallback, surfaced clearly in the server log).

export async function runInTransaction<T>(
  fn: (session: ClientSession | null) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      console.warn(
        "[outbox] MongoDB transactions unavailable (standalone server). " +
          "Falling back to non-transactional emit — edge F protection is degraded. " +
          "Use a replica set (e.g. `mongod --replSet rs0`) or Atlas for the full Transactional Outbox."
      );
      return await fn(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

function isTransactionUnsupported(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("transaction numbers are only allowed") ||
    msg.includes("transactions are not supported") ||
    msg.includes("multi-document transactions") ||
    msg.includes("transaction")
  ) && !msg.includes("abort"); // don't mask real business failures
}

// ── Emit (edge A + D) ────────────────────────────────────────────────────────
// Upserts on eventKey. Returns the event (or null if it already existed —
// duplicates are silently dropped). sequenceNumber is assigned here so every
// event for an aggregate is ordered at write time.

export interface OutboxEventInput {
  type: EventType;
  aggregateType: AggregateType;
  aggregateId: Types.ObjectId;
  siteId?: Types.ObjectId;
  actorId?: Types.ObjectId | null;
  payload?: unknown;
  maxRetries?: number;
  eventKey?: string; // default: "<aggregateType>:<aggregateId>:<type>"
}

export async function emitOutboxEvent(
  input: OutboxEventInput,
  session?: ClientSession | null
): Promise<IOutboxEvent | null> {
  const eventKey =
    input.eventKey ??
    `${input.aggregateType}:${input.aggregateId.toString()}:${input.type}`;

  // Per-aggregate sequence (D) — count existing events for this aggregate.
  const sequenceNumber =
    (await OutboxEvent.countDocuments(
      { aggregateType: input.aggregateType, aggregateId: input.aggregateId },
      { ...sessionOption(session) }
    )) + 1;

  const result = await OutboxEvent.findOneAndUpdate(
    { eventKey },
    {
      $setOnInsert: {
        eventKey,
        type: input.type,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        siteId: input.siteId ?? null,
        actorId: input.actorId ?? null,
        sequenceNumber,
        payload: input.payload ?? null,
        status: "pending" as OutboxStatus,
        retryCount: 0,
        maxRetries: input.maxRetries ?? OUTBOX_MAX_RETRIES,
        nextAttemptAt: new Date(),
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      includeResultMetadata: true,
      ...sessionOption(session),
    }
  );

  // Upserted is falsy → the event already exists → duplicate dropped (A).
  if (!result.lastErrorObject?.upserted) return null;

  return result.value as unknown as IOutboxEvent;
}

// ── Worker: claim (two-phase, edge B + G) ────────────────────────────────────

async function claimEvents(
  batchSize: number,
  now: Date
): Promise<IOutboxEvent[]> {
  const candidates = await OutboxEvent.find({
    status: "pending",
    nextAttemptAt: { $lte: now },
  })
    .sort({ nextAttemptAt: 1, createdAt: 1 })
    .limit(batchSize)
    .lean();

  const claimed: IOutboxEvent[] = [];
  for (const candidate of candidates) {
    // Atomic claim — only one worker wins per event (edge G: no double-run).
    const updated = await OutboxEvent.findOneAndUpdate(
      {
        _id: candidate._id,
        status: "pending",
        nextAttemptAt: { $lte: now },
      },
      { $set: { status: "processing", processingStartedAt: now } },
      { returnDocument: "after" }
    );
    if (updated) claimed.push(updated.toObject() as IOutboxEvent);
  }
  return claimed;
}

// ── Worker: process a cycle ──────────────────────────────────────────────────

export interface OutboxRunStats {
  claimed: number;
  completed: number;
  heldForOrdering: number;
  retried: number;
  deadLettered: number;
}

export async function processOutboxEvents(opts?: {
  batchSize?: number;
  now?: Date;
}): Promise<OutboxRunStats> {
  const batchSize = opts?.batchSize ?? OUTBOX_BATCH_SIZE;
  const now = opts?.now ?? new Date();
  const stats: OutboxRunStats = {
    claimed: 0,
    completed: 0,
    heldForOrdering: 0,
    retried: 0,
    deadLettered: 0,
  };

  const events = await claimEvents(batchSize, now);
  stats.claimed = events.length;

  for (const event of events) {
    // Ordering guard (D): if an earlier event for the same aggregate is still
    // incomplete, hold this one and try again later.
    const gap = await OutboxEvent.exists({
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      sequenceNumber: { $lt: event.sequenceNumber },
      status: { $in: ["pending", "processing"] },
    });
    if (gap) {
      stats.heldForOrdering++;
      await OutboxEvent.findByIdAndUpdate(event._id, {
        $set: {
          status: "pending",
          nextAttemptAt: new Date(now.getTime() + ORDERING_HOLD_MS),
        },
      });
      continue;
    }

    try {
      // Consumers are idempotent (B): re-delivery after a crash is safe.
      await dispatchEvent(event);
      await OutboxEvent.findByIdAndUpdate(event._id, {
        $set: { status: "completed", processedAt: new Date() },
      });
      stats.completed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const deadLettered = await markFailed(event._id, errorMsg, now);
      if (deadLettered) stats.deadLettered++;
      else stats.retried++;
    }
  }

  return stats;
}

// ── Worker: retry bookkeeping (edge C) ───────────────────────────────────────

async function markFailed(
  id: Types.ObjectId,
  errorMsg: string,
  now: Date
): Promise<boolean> {
  const event = await OutboxEvent.findById(id);
  if (!event) return false;

  const attempts = event.retryCount + 1;
  const truncated = errorMsg.slice(0, 500);

  if (attempts > event.maxRetries) {
    // Exhausted → Dead Letter Queue, event frozen as "dead".
    await moveToDeadLetter(event, truncated);
    await OutboxEvent.findByIdAndUpdate(id, {
      $set: {
        status: "dead",
        retryCount: attempts,
        lastError: truncated,
      },
    });
    return true;
  }

  const backoffMs = Math.min(
    BACKOFF_CAP_MS,
    BACKOFF_BASE_MS * 2 ** (attempts - 1)
  );
  await OutboxEvent.findByIdAndUpdate(id, {
    $set: {
      status: "pending",
      retryCount: attempts,
      lastError: truncated,
      nextAttemptAt: new Date(now.getTime() + backoffMs),
    },
  });
  return false;
}

// ── Dead Letter Queue (edge C) ───────────────────────────────────────────────

async function moveToDeadLetter(
  event: IOutboxEvent,
  errorMsg: string
): Promise<void> {
  await FailedJob.create({
    jobType: event.type,
    payload: {
      eventKey: event.eventKey,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId.toString(),
      siteId: event.siteId?.toString() ?? null,
      actorId: event.actorId?.toString() ?? null,
      payload: event.payload ?? null,
    },
    error: errorMsg,
    attempts: event.retryCount + 1,
    firstFailedAt: event.createdAt,
    lastFailedAt: new Date(),
    status: "failed",
  });
}

// ── Crash recovery (edge B) ──────────────────────────────────────────────────
// Events stuck in "processing" past the lease window (e.g. the worker died
// mid-event) are reset to "pending". Consumers are idempotent, so re-running
// them cannot double-create alerts/audit rows.

export async function recoverStaleProcessing(opts?: {
  leaseMs?: number;
}): Promise<number> {
  const leaseMs = opts?.leaseMs ?? OUTBOX_LEASE_MS;
  const cutoff = new Date(Date.now() - leaseMs);

  const stuck = await OutboxEvent.find({
    status: "processing",
    processingStartedAt: { $lt: cutoff },
  }).select("_id");

  for (const ev of stuck) {
    await OutboxEvent.findByIdAndUpdate(ev._id, {
      $set: {
        status: "pending",
        nextAttemptAt: new Date(),
        lastError: "Recovered from stale processing (worker crash/restart).",
        processingStartedAt: null,
      },
    });
  }
  return stuck.length;
}

// ── Admin / System Health ────────────────────────────────────────────────────

export interface OutboxStats {
  pending: number;
  processing: number;
  completed: number;
  dead: number;
  deadLetterQueue: number;
  checkedAt: Date;
}

export async function getOutboxStats(): Promise<OutboxStats> {
  const [pending, processing, completed, dead, dlq] = await Promise.all([
    OutboxEvent.countDocuments({ status: "pending" }),
    OutboxEvent.countDocuments({ status: "processing" }),
    OutboxEvent.countDocuments({ status: "completed" }),
    OutboxEvent.countDocuments({ status: "dead" }),
    FailedJob.countDocuments({}),
  ]);
  return {
    pending,
    processing,
    completed,
    dead,
    deadLetterQueue: dlq,
    checkedAt: new Date(),
  };
}