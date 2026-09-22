import { Schema, model } from "mongoose";
import type { ISlaPolicy, IEscalationLevel } from "../types/index.js";

// ── SlaPolicy (Configurable Escalation Matrix, feature 02) ────────────────────
// Per-severity SLA definition stored in MongoDB instead of the hardcoded
// ALERT_DEADLINES map. Admin-managed via the corporate/regulator API; the
// workflow engine snapshots these values onto each alert at creation time.
//
// Guarantees encoded here (defense in depth — runs on EVERY write path, not
// just the admin API):
//   - escalationChain levels are contiguous from 1
//   - roles never repeat ⇒ no circular escalation (edge D)
//   - waitMinutes strictly increasing (absolute offsets from alert creation)
//   - last level never outlives the resolution SLA; resolutionSla >= ackSla

const escalationLevelSchema = new Schema<IEscalationLevel>(
  {
    level: {
      type: Number,
      required: [true, "level is required."],
      min: 1,
    },
    role: {
      type: String,
      required: [true, "role is required."],
      enum: {
        values: ["mine_official", "corporate_manager", "regulator"],
        message: "{VALUE} is not a valid escalation target role.",
      },
      // field_officer is intentionally excluded — they report, they don't own.
    },
    waitMinutes: {
      type: Number,
      required: [true, "waitMinutes is required."],
      min: 1,
      // absolute minutes from alert creation; strictly increasing across levels
    },
  },
  { _id: false }
);

const slaPolicySchema = new Schema<ISlaPolicy>(
  {
    severity: {
      type: String,
      required: [true, "severity is required."],
      enum: {
        values: ["low", "medium", "high", "critical"],
        message: "{VALUE} is not a valid severity.",
      },
    },
    ackSla: {
      type: Number,
      required: [true, "ackSla is required."],
      min: 1,
      // minutes within which the alert must be acknowledged
    },
    resolutionSla: {
      type: Number,
      required: [true, "resolutionSla is required."],
      min: 1,
      // minutes within which the alert must be resolved (final deadline)
    },
    escalationChain: {
      type: [escalationLevelSchema],
      required: [true, "escalationChain is required."],
      validate: {
        validator: (chain: IEscalationLevel[]) =>
          Array.isArray(chain) && chain.length >= 1 && chain.length <= 5,
        message: "escalationChain must contain between 1 and 5 levels.",
      },
    },
    systemFallbackUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // last-resort assignee (edge C): when no chain role has an active user,
      // the escalation lands here instead of disappearing.
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// One policy per severity — the admin API upserts by severity, never duplicates.
slaPolicySchema.index({ severity: 1 }, { unique: true });

// ── Structural validation (pre-validate) ─────────────────────────────────────
// Cross-field rules that a per-path validator can't express cleanly. Runs for
// every writer: admin API, seed, tests, future tooling. Sync hook — no next().

slaPolicySchema.pre("validate", function () {
  // `this` is the document being validated; type it narrowly so we can call
  // invalidate() without widening (mongoose pre-hooks type `this` as any).
  const doc = this as ISlaPolicy & {
    invalidate: (path: string, msg: string) => void;
  };
  const chain: IEscalationLevel[] = Array.isArray(doc.escalationChain)
    ? doc.escalationChain
    : [];

  const seenRoles = new Set<string>();
  for (let i = 0; i < chain.length; i++) {
    const step = chain[i];
    if (!step) continue;

    if (step.level !== i + 1) {
      doc.invalidate(
        "escalationChain",
        `Levels must be contiguous starting at 1 (expected level ${i + 1}, got ${step.level}).`
      );
    }

    if (seenRoles.has(step.role)) {
      doc.invalidate(
        "escalationChain",
        `Escalation chain repeats role "${step.role}" — circular escalation is not allowed.`
      );
    }
    seenRoles.add(step.role);

    if (i > 0 && step.waitMinutes <= (chain[i - 1]?.waitMinutes ?? 0)) {
      doc.invalidate(
        "escalationChain",
        "waitMinutes must be strictly increasing across levels."
      );
    }
  }

  const last = chain[chain.length - 1];
  if (last && last.waitMinutes > (doc.resolutionSla ?? 0)) {
    doc.invalidate(
      "escalationChain",
      "The last escalation level must not exceed the resolution SLA."
    );
  }

  if ((doc.resolutionSla ?? 0) < (doc.ackSla ?? 0)) {
    doc.invalidate("resolutionSla", "resolutionSla must be >= ackSla.");
  }
});

const SlaPolicy = model<ISlaPolicy>("SlaPolicy", slaPolicySchema);

export default SlaPolicy;