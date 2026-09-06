import "dotenv/config";
import type { Types } from "mongoose";
import connectDB from "./src/config/db.js";
import AuditLog from "./src/models/AuditLog.js";
import {
  GENESIS_HASH,
  computeThisHash,
} from "./src/services/auditLogger.js";

// ── Audit trail verification ─────────────────────────────────────────────────
// Recomputes the hash chain from the stored (insertion-order) entries and
// reports VALID or the first broken index. Any tampering with a historical
// entry (update/delete/reorder) breaks the chain at that point — this is the
// demo behind "tamper-evident audit trail".

type Row = {
  entityType: string;
  entityId: Types.ObjectId;
  action: string;
  actorId?: Types.ObjectId | null;
  payload?: unknown;
  prevHash: string;
  thisHash: string;
  createdAt: Date;
};

(async () => {
  await connectDB();
  const rows = (await AuditLog.find({})
    .sort({ createdAt: 1, _id: 1 })
    .lean()) as unknown as Row[];

  if (rows.length === 0) {
    console.log("No audit entries found. Seed or trigger a sync, then re-run.");
    process.exit(0);
  }

  console.log(`Verifying ${rows.length} audit entries...`);
  let prevOnChain = GENESIS_HASH;
  const broken: number[] = [];

  rows.forEach((row, i) => {
    const expectedThis = computeThisHash({
      entityType: row.entityType,
      entityId: row.entityId,
      action: row.action,
      actorId: row.actorId ?? undefined,
      payload: row.payload,
      prevHash: row.prevHash,
      createdAt: row.createdAt,
    });

    if (row.prevHash !== prevOnChain) broken.push(i);
    if (row.thisHash !== expectedThis) broken.push(i);
    prevOnChain = row.thisHash;
  });

  if (broken.length === 0) {
    console.log(`CHAIN VALID — all ${rows.length} entries are intact.`);
    process.exit(0);
  }

  console.log(`CHAIN BROKEN at indices: ${[...new Set(broken)].join(", ")}`);
  process.exit(1);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});