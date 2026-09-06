import mongoose from "mongoose";
import Alert from "../models/Alert.js";

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
  await Alert.syncIndexes();
  console.log("Alert indexes synced with schema.");
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
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1); // crash fast — no point running without a DB
  }
};

export default connectDB;
