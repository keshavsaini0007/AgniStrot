import { Schema, model } from "mongoose";
import type { IAuditLog } from "../types/index.js";

const auditLogSchema = new Schema<IAuditLog>(
  {
    entityType: {
      type: String,
      required: [true, "entityType is required."],
      // what kind of record was acted on: 'inspection', 'incident', 'alert', etc.
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, "entityId is required."],
      // the _id of the specific record that was acted on
    },
    action: {
      type: String,
      required: [true, "action is required."],
      // what happened: 'created', 'status_changed', 'escalated', 'resolved', etc.
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // null = system-triggered action (cron job, rule engine)
      // ObjectId = a logged-in user performed this action
    },
    payload: {
      type: Schema.Types.Mixed,
      default: null,
      // snapshot of the relevant data at the time of the action
      // e.g. { from: 'open', to: 'escalated' } for a status change
    },
    prevHash: {
      type: String,
      required: [true, "prevHash is required."],
      // SHA-256 hash of the previous log entry
      // genesis entry uses '0'.repeat(64) as prevHash
    },
    thisHash: {
      type: String,
      required: [true, "thisHash is required."],
      // SHA-256 hash of (entityType + entityId + action + actorId + payload + prevHash + timestamp)
      // if ANY historical entry is altered, its hash breaks — and every entry after it breaks too
      // this is what makes the log tamper-evident
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── CRITICAL: this collection is INSERT-ONLY ───────────────────────────────
// No route, service, or script should ever call .findOneAndUpdate(),
// .updateOne(), .deleteOne(), or .deleteMany() on AuditLog.
// The only allowed operation is AuditLog.create().
// Enforced by convention here; could be enforced at DB level with Atlas
// role permissions before production deployment.

// ── Indexes ────────────────────────────────────────────────────────────────
// Query: "show me the full audit trail for a specific alert or inspection"
auditLogSchema.index({ entityType: 1, entityId: 1 });

// Hash chain verification: "get all entries in insertion order to recompute hashes"
auditLogSchema.index({ createdAt: 1 });

const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;
