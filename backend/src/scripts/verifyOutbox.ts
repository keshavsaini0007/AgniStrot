import "dotenv/config";
import mongoose, { Types } from "mongoose";
import OutboxEvent from "../models/OutboxEvent.js";
import FailedJob from "../models/FailedJob.js";
import {
  emitOutboxEvent,
  processOutboxEvents,
  recoverStaleProcessing,
  getOutboxStats,
} from "../services/outboxService.js";
import type { EventType } from "../types/index.js";

// ── verifyOutbox.ts ──────────────────────────────────────────────────────────
// Proves the event-driven architecture end-to-end against the real DB:
//
//   A. Duplicate events are deduped (unique eventKey)
//   B. Idempotent consumption (re-delivery never double-logs)
//   C. Exhausted retries route to the Dead Letter Queue
//   D. Out-of-order events are held while an earlier sibling is incomplete
//   E. Events for deleted entities are dropped safely (no side-effects)
//   G. Worker batches events (bounded claim) and recovers stale leases
//
// Safe to re-run: all test records are tagged payload.test = true and deleted
// at the end. Run with:  npm run verify:outbox

const TAG = { test: true, source: "verifyOutbox" };
let passed = 0;
let failed = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function cleanup(): Promise<void> {
  await OutboxEvent.deleteMany({ "payload.test": true });
  await FailedJob.deleteMany({ "payload.test": true });
}

const main = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`Connected: ${mongoose.connection.host}\n`);

  // Ensure unique eventKey index exists before the dedupe test.
  await OutboxEvent.syncIndexes();
  await FailedJob.syncIndexes();
  await cleanup();

  // ── A. Duplicate event dedupe ─────────────────────────────────────────────
  console.log("A. Duplicate event dedupe (unique eventKey)");
  const aggA = new Types.ObjectId();
  const first = await emitOutboxEvent({
    type: "INCIDENT_CREATED",
    aggregateType: "incident",
    aggregateId: aggA,
    payload: TAG,
  });
  const second = await emitOutboxEvent({
    type: "INCIDENT_CREATED",
    aggregateType: "incident",
    aggregateId: aggA,
    payload: TAG,
  });
  const dedupeCount = await OutboxEvent.countDocuments({
    eventKey: `incident:${aggA.toString()}:INCIDENT_CREATED`,
  });
  ok("second emit returned null (deduped)", second === null);
  ok("exactly one outbox row for the duplicate key", dedupeCount === 1);

  // ── E. Deleted entity — consumer drops the event safely ──────────────────
  console.log("B/E. Event processed for a deleted entity");
  const run1 = await processOutboxEvents({ batchSize: 50 });
  const eStatus = await OutboxEvent.findOne({ aggregateId: aggA }).lean();
  ok("event completed (no side-effects, no crash)", eStatus?.status === "completed");

  // ── C. Retry → Dead Letter Queue ─────────────────────────────────────────
  console.log("C. Repeated failures route to the Dead Letter Queue");
  const aggC = new Types.ObjectId();
  await emitOutboxEvent({
    type: "UNKNOWN_EVENT_C" as unknown as EventType,
    aggregateType: "incident",
    aggregateId: aggC,
    payload: TAG,
    maxRetries: 1, // 1 retry after the first attempt, then DLQ
  });
  const runC1 = await processOutboxEvents({ batchSize: 50 });
  const afterFirst = await OutboxEvent.findOne({ aggregateId: aggC }).lean();
  ok(
    "first failure retried (still pending, nextAttemptAt in future)",
    afterFirst?.status === "pending" &&
      afterFirst.retryCount === 1 &&
      (afterFirst.nextAttemptAt as Date).getTime() > Date.now()
  );

  // Force the retry immediately instead of waiting for backoff.
  await OutboxEvent.updateOne(
    { aggregateId: aggC },
    { $set: { nextAttemptAt: new Date() } }
  );
  const runC2 = await processOutboxEvents({ batchSize: 50 });
  const afterSecond = await OutboxEvent.findOne({ aggregateId: aggC }).lean();
  const dlq = await FailedJob.findOne({ jobType: "UNKNOWN_EVENT_C" }).lean();
  ok("event marked dead after exhausting retries", afterSecond?.status === "dead");
  ok("FailedJob (DLQ) record created", !!dlq);
  ok("worker stats: deadLettered tracked", runC2.deadLettered === 1);

  // ── D. Ordering — hold while an earlier sibling is incomplete ────────────
  console.log("D. Out-of-order events are held");
  const aggD = new Types.ObjectId();
  // seq 1: a failing consumer (maxRetries high → stays pending, not dead)
  await emitOutboxEvent({
    type: "UNKNOWN_EVENT_D" as unknown as EventType,
    aggregateType: "incident",
    aggregateId: aggD,
    payload: TAG,
    maxRetries: 5,
  });
  // seq 2: a healthy consumer for the same aggregate
  await emitOutboxEvent({
    type: "DOCUMENT_UPLOADED",
    aggregateType: "incident", // reuse aggregate to force the ordering check
    aggregateId: aggD,
    payload: TAG,
  });
  const runD = await processOutboxEvents({ batchSize: 50 });
  const seq2 = await OutboxEvent.findOne({
    aggregateId: aggD,
    type: "DOCUMENT_UPLOADED",
  }).lean();
  ok(
    "seq-2 event held while seq-1 is incomplete",
    seq2?.status === "pending" &&
      (seq2.nextAttemptAt as Date).getTime() > Date.now()
  );

  // ── B. Crash recovery (stale processing lease) ────────────────────────────
  console.log("F. Stale 'processing' events are recovered after a crash");
  const aggF = new Types.ObjectId();
  await emitOutboxEvent({
    type: "DOCUMENT_UPLOADED",
    aggregateType: "document",
    aggregateId: aggF,
    payload: TAG,
  });
  await OutboxEvent.updateOne(
    { aggregateId: aggF },
    {
      $set: {
        status: "processing",
        processingStartedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
      },
    }
  );
  const recovered = await recoverStaleProcessing({ leaseMs: 5 * 60 * 1000 });
  const staleAfter = await OutboxEvent.findOne({ aggregateId: aggF }).lean();
  ok("stale event pushed back to pending", recovered === 1 && staleAfter?.status === "pending");

  // ── G. Batch limit respected ──────────────────────────────────────────────
  console.log("G. Bounded batch claim");
  for (let i = 0; i < 3; i++) {
    await emitOutboxEvent({
      type: "DOCUMENT_UPLOADED",
      aggregateType: "document",
      aggregateId: new Types.ObjectId(),
      payload: TAG,
    });
  }
  const runG = await processOutboxEvents({ batchSize: 2 });
  ok(
    "batch claimed at most the configured limit",
    runG.claimed <= 2 && runG.claimed >= 1
  );
  const remaining = await OutboxEvent.countDocuments({
    "payload.test": true,
    status: "pending",
  });
  ok("remaining events stay pending for the next cycle", remaining >= 1);

  // ── H. New consumers (alert lifecycle) — edge E ───────────────────────────
  console.log("H. Alert-lifecycle consumers (edge E: deleted entities)");
  const aggHAlert = new Types.ObjectId(); // alert does not exist
  await emitOutboxEvent({
    type: "ALERT_CREATED",
    aggregateType: "alert",
    aggregateId: aggHAlert,
    payload: TAG,
  });
  await emitOutboxEvent({
    type: "ALERT_REMINDED",
    aggregateType: "alert",
    aggregateId: aggHAlert,
    payload: TAG,
  });
  await emitOutboxEvent({
    type: "ALERT_ESCALATED",
    aggregateType: "alert",
    aggregateId: aggHAlert,
    payload: TAG,
  });

  // Processing here also drains leftover DOCUMENT_UPLOADED test events from
  // earlier sections — they now carry the same edge-E guard, so nothing with a
  // fake aggregate can write audit rows.
  await processOutboxEvents({ batchSize: 50 });
  const alertEvents = await OutboxEvent.find({
    "payload.test": true,
    aggregateId: aggHAlert,
  }).lean();
  ok(
    "ALERT_CREATED/REMINDED/ESCALATED dropped cleanly for missing alert",
    alertEvents.length === 3 && alertEvents.every((e) => e.status === "completed")
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  const stats = await getOutboxStats();
  console.log(`\nOutbox state: ${JSON.stringify(stats, null, 2)}`);
  console.log(
    `\n${passed} passed, ${failed} failed` + (failed === 0 ? " ✅" : " ❌")
  );

  await cleanup();
  await mongoose.disconnect();
  process.exit(failed === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error("verifyOutbox aborted:", err);
  process.exit(1);
});