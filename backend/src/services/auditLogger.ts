import { createHash } from "crypto";
import type { Types } from "mongoose";
import AuditLog from "../models/AuditLog.js";

// ── Hash-Chained Audit Logger ────────────────────────────────────────────────
// Insert-only (never update/delete). Every entry stores the SHA-256 hash of the
// previous entry (prevHash) plus a hash of its own canonical fields (thisHash).
// If ANY historical entry is altered, its thisHash no longer matches a recompute
// — and every subsequent entry breaks too, because their prevHash chain snaps.
//
// genesis: prevHash = "0".repeat(64)

export const GENESIS_HASH = "0".repeat(64);

// ── Shared canonical serialization + hash ─────────────────────────────────────
// Exported so the verification script recomputes EXACTLY what was written.

export interface HashParts {
  entityType: string;
  entityId: Types.ObjectId;
  action: string;
  actorId?: Types.ObjectId;
  payload?: unknown;
  prevHash: string;
  createdAt: Date;
}

export function computeThisHash(parts: HashParts): string {
  const canonical = [
    parts.entityType,
    parts.entityId.toString(),
    parts.action,
    parts.actorId ? parts.actorId.toString() : "system",
    JSON.stringify(parts.payload ?? null),
    parts.prevHash,
    parts.createdAt.toISOString(),
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

// ── Append an entry ───────────────────────────────────────────────────────────
// Reads the tail entry for prevHash, then appends. Sequential by nature in the
// current flows (cron + per-request). For production-grade concurrency safety,
// gate the insert on the tail still existing (exists({ thisHash: prevHash })).

export interface AuditEntry {
  entityType: string;
  entityId: Types.ObjectId;
  action: string;
  actorId?: Types.ObjectId;
  payload?: unknown;
  dedupeKey?: string;
  // When set, the entry is written idempotently: a replay with the same
  // dedupeKey (e.g. the outbox eventKey) is silently ignored thanks to the
  // sparse unique index on { dedupeKey }. Keeps the hash chain append-only while
  // making event-driven consumers safe against re-delivery (outbox edge B).
}

export async function logAction(entry: AuditEntry): Promise<void> {
  const last = await AuditLog.findOne()
    .sort({ createdAt: -1 })
    .select("thisHash")
    .lean();
  const prevHash = last?.thisHash ?? GENESIS_HASH;
  const createdAt = new Date();

  try {
    await AuditLog.create({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      ...(entry.actorId ? { actorId: entry.actorId } : {}),
      payload: entry.payload ?? null,
      ...(entry.dedupeKey ? { dedupeKey: entry.dedupeKey } : {}),
      prevHash,
      thisHash: computeThisHash({
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        ...(entry.actorId ? { actorId: entry.actorId } : {}),
        payload: entry.payload,
        prevHash,
        createdAt,
      }),
      createdAt,
    });
  } catch (err) {
    // Duplicate dedupeKey → already logged for this event → idempotent skip.
    if ((err as { code?: number })?.code === 11000 && entry.dedupeKey) return;
    throw err;
  }
}