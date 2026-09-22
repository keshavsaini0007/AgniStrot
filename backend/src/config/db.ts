import mongoose from "mongoose";
import Alert from "../models/Alert.js";
import WorkflowState from "../models/WorkflowState.js";
import AuditLog from "../models/AuditLog.js";
import OutboxEvent from "../models/OutboxEvent.js";
import FailedJob from "../models/FailedJob.js";

// ── Index sync ───────────────────────────────────────────────────────────────
// MongoDB's createIndex() does NOT rebuild an index whose key pattern already
// exists with different options, and autoIndex can drop/swap indexes when a
// schema changes mid-air. syncIndexes() reconciles the live collection with
// the current schema:
//   - {sourceId, ruleCode}         → plain (non-unique) query index
//   - {ruleKey}                    → UNIQUE — the DB-level dedup guarantee.
// History: the composite was once unique, and Mongo indexes MISSING fields as
// null, so batch alerts (no sourceId) collided. Dedup now lives on ruleKey,
// which is present on every alert.

async function fixAlertIndexes(): Promise<void> {
  // Pre-ruleKey alerts (inserted before the dedup field existed) have ruleKey:
  // null in the DB. The unique ruleKey_1 index can't be reconciled until they
  // are cleaned up — delete them first, then sync.
  await Alert.deleteMany({ ruleKey: null });
  await Alert.syncIndexes();
  await WorkflowState.syncIndexes();
  // Normalize legacy audit rows that stored dedupeKey: null — a sparse unique
  // index indexes explicit nulls, so they'd collide when the engine recreates
  // the index. Non-event entries must OMIT the field, not null it.
  await AuditLog.updateMany({ dedupeKey: null }, { $unset: { dedupeKey: "" } });
  await AuditLog.syncIndexes();
  await OutboxEvent.syncIndexes();
  await FailedJob.syncIndexes();
  console.log("Alert indexes synced with schema.");
}

// ── Replica-set detection ────────────────────────────────────────────────────
// MongoDB transactions (used by the Transactional Outbox) only work on a
// replica set. Atlas/Atlas-local is fine; a standalone local mongod is not. No
// hard failure — emitOutboxEvent degrades gracefully — but we surface the gap.

async function warnIfTransactionsUnavailable(): Promise<void> {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const hello = await db.admin().command({ hello: 1 });
    const onReplicaSet = typeof hello?.setName === "string";
    if (!onReplicaSet) {
      console.warn(
        "[db] Standalone MongoDB detected — MongoDB transactions are unavailable, " +
          "so the outbox falls back to non-transactional emit (edge F protection degraded). " +
          "Start mongod with --replSet rs0 (or use Atlas) for the full Transactional Outbox."
      );
    }
  } catch {
    // hello command unsupported on this driver/server — skip the check.
  }
}

export { fixAlertIndexes as ensureAlertIndexes };

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables.");
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await fixAlertIndexes();
    await warnIfTransactionsUnavailable();
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1); // crash fast — no point running without a DB
  }
};

export default connectDB;
