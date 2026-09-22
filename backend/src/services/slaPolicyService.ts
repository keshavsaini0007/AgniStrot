import { Types } from "mongoose";
import SlaPolicy from "../models/SlaPolicy.js";
import User from "../models/User.js";
import type {
  ISlaPolicy,
  ISlaSnapshot,
  IEscalationLevel,
  AlertSeverity,
  UserRole,
} from "../types/index.js";

// ── Configurable SLA policy service (feature 02, Phase A) ─────────────────────
// Reads per-severity SlaPolicy rows from MongoDB, caches them in memory
// (invalidated on every mutation), and falls back to deterministic defaults
// that preserve the legacy hardcoded ALERT_DEADLINES behavior when no custom
// row exists. The workflow engine consumes these as SNAPSHOTS at alert
// creation (edge G), never as live lookups.

export const SYSTEM_ADMIN_EMAIL = "sysadmin@agnistrot.com";

// Roles an escalation may advance TO. field_officer is never a target — they
// report observations, they don't own the response.
export const SLA_POLICY_TARGET_ROLES: UserRole[] = [
  "mine_official",
  "corporate_manager",
  "regulator",
];

// Severity display order for the admin/dashboard views.
export const SEVERITY_ORDER: AlertSeverity[] = ["critical", "high", "medium", "low"];

// ── Defaults ──────────────────────────────────────────────────────────────────
// Level-1 waitMinutes match the legacy ALERT_DEADLINES values (critical 2h,
// high 24h, medium 3d, low 7d) so first-escalation behavior is unchanged until
// an admin tunes it. Last level coincides with the resolution SLA.
export interface SlaPolicySeedInput {
  severity: AlertSeverity;
  ackSla: number;
  resolutionSla: number;
  escalationChain: IEscalationLevel[];
}

export const DEFAULT_SLA_POLICIES: SlaPolicySeedInput[] = [
  {
    severity: "critical",
    ackSla: 30,            // acknowledge within 30 minutes
    resolutionSla: 180,    // resolve within 3 hours
    escalationChain: [
      { level: 1, role: "mine_official", waitMinutes: 120 },
      { level: 2, role: "corporate_manager", waitMinutes: 150 },
      { level: 3, role: "regulator", waitMinutes: 180 },
    ],
  },
  {
    severity: "high",
    ackSla: 240,           // acknowledge within 4 hours
    resolutionSla: 4320,   // resolve within 3 days
    escalationChain: [
      { level: 1, role: "mine_official", waitMinutes: 1440 },
      { level: 2, role: "corporate_manager", waitMinutes: 2880 },
      { level: 3, role: "regulator", waitMinutes: 4320 },
    ],
  },
  {
    severity: "medium",
    ackSla: 720,           // acknowledge within 12 hours
    resolutionSla: 12960,  // resolve within 9 days
    escalationChain: [
      { level: 1, role: "mine_official", waitMinutes: 4320 },
      { level: 2, role: "corporate_manager", waitMinutes: 8640 },
      { level: 3, role: "regulator", waitMinutes: 12960 },
    ],
  },
  {
    severity: "low",
    ackSla: 1440,          // acknowledge within 24 hours
    resolutionSla: 30240,  // resolve within 21 days
    escalationChain: [
      { level: 1, role: "mine_official", waitMinutes: 10080 },
      { level: 2, role: "corporate_manager", waitMinutes: 20160 },
      { level: 3, role: "regulator", waitMinutes: 30240 },
    ],
  },
];

// ── In-memory cache ───────────────────────────────────────────────────────────

let policyCache: Map<AlertSeverity, ISlaPolicy> | null = null;

async function ensureLoaded(): Promise<void> {
  if (policyCache) return;
  const rows = await SlaPolicy.find({}).lean();
  policyCache = new Map(rows.map((r) => [r.severity, r]));
}

// Call after ANY SlaPolicy mutation so the next read re-fetches from MongoDB.
export function invalidateSlaPolicies(): void {
  policyCache = null;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getSlaPolicyRow(
  severity: AlertSeverity
): Promise<ISlaPolicy | null> {
  await ensureLoaded();
  return policyCache?.get(severity) ?? null;
}

export async function listSlaPolicyRows(): Promise<ISlaPolicy[]> {
  await ensureLoaded();
  return SEVERITY_ORDER.flatMap((sev) => {
    const row = policyCache?.get(sev);
    return row ? [row] : [];
  });
}

// Effective snapshot for the engine: the configured row when present, otherwise
// the deterministic default (which mirrors legacy ALERT_DEADLINES for level 1).
export async function getSlaSnapshot(severity: AlertSeverity): Promise<ISlaSnapshot> {
  const row = await getSlaPolicyRow(severity);
  if (row) {
    return {
      ackSla: row.ackSla,
      resolutionSla: row.resolutionSla,
      escalationChain: row.escalationChain.map((l) => ({ ...l })),
    };
  }
  const def = DEFAULT_SLA_POLICIES.find((p) => p.severity === severity);
  if (def) {
    return {
      ackSla: def.ackSla,
      resolutionSla: def.resolutionSla,
      escalationChain: def.escalationChain.map((l) => ({ ...l })),
    };
  }
  // Last-resort: legacy constants as a single-level ladder.
  const FALLBACK: Record<AlertSeverity, number> = {
    critical: 120,
    high: 1440,
    medium: 4320,
    low: 10080,
  };
  const minutes = FALLBACK[severity] ?? 1440;
  return {
    ackSla: Math.max(1, Math.round(minutes / 4)),
    resolutionSla: minutes,
    escalationChain: [{ level: 1, role: "mine_official", waitMinutes: minutes }],
  };
}

// ── "Effective" view for the admin API ────────────────────────────────────────
// What the system actually applies per severity, plus whether it's a custom row
// or the built-in default (so the UI can show "using default" vs "custom").

export interface EffectiveSlaPolicy {
  severity: AlertSeverity;
  ackSla: number;
  resolutionSla: number;
  escalationChain: IEscalationLevel[];
  systemFallbackUserId: string | null;
  updatedAt: string | null;
  source: "configured" | "default";
}

export async function getEffectiveSlaPolicy(
  severity: AlertSeverity
): Promise<EffectiveSlaPolicy> {
  const row = await getSlaPolicyRow(severity);
  const snapshot = await getSlaSnapshot(severity);
  return {
    severity,
    ackSla: snapshot.ackSla,
    resolutionSla: snapshot.resolutionSla,
    escalationChain: snapshot.escalationChain,
    systemFallbackUserId: row?.systemFallbackUserId?.toString() ?? null,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
    source: row ? "configured" : "default",
  };
}

export async function listEffectiveSlaPolicies(): Promise<EffectiveSlaPolicy[]> {
  return Promise.all(SEVERITY_ORDER.map((sev) => getEffectiveSlaPolicy(sev)));
}

// ── System Administrator fallback (edge C) ────────────────────────────────────
// Seeded user that acts as the final stop when every rung of the ladder has no
// active assignee. Held under the corporate_manager role — no new RBAC entry.

export async function findSystemAdminUserId(): Promise<Types.ObjectId | null> {
  const admin = await User.findOne({ email: SYSTEM_ADMIN_EMAIL }).select("_id").lean();
  return admin?._id ?? null;
}

// ── Defaults restore (seed + POST /reset) ─────────────────────────────────────

export async function resetSlaPoliciesToDefaults(): Promise<number> {
  const fallbackUserId = await findSystemAdminUserId();
  await SlaPolicy.deleteMany({});
  const docs = DEFAULT_SLA_POLICIES.map((p) => ({
    ...p,
    escalationChain: p.escalationChain.map((l) => ({ ...l })),
    systemFallbackUserId: fallbackUserId ?? null,
  }));
  await SlaPolicy.insertMany(docs);
  invalidateSlaPolicies();
  return docs.length;
}

// ── Upsert/delete helpers (controller-facing) ─────────────────────────────────

export async function upsertSlaPolicy(
  severity: AlertSeverity,
  input: {
    ackSla: number;
    resolutionSla: number;
    escalationChain: IEscalationLevel[];
    systemFallbackUserId?: string | null;
    updatedBy?: Types.ObjectId;
  }
): Promise<ISlaPolicy> {
  const doc = await SlaPolicy.findOneAndUpdate(
    { severity },
    {
      $set: {
        ackSla: input.ackSla,
        resolutionSla: input.resolutionSla,
        escalationChain: input.escalationChain.map((l, i) => ({
          level: i + 1,
          role: l.role,
          waitMinutes: l.waitMinutes,
        })),
        systemFallbackUserId: input.systemFallbackUserId
          ? new Types.ObjectId(input.systemFallbackUserId)
          : null,
        updatedBy: input.updatedBy ?? null,
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  // Normalize stored level numbers regardless of what the client sent.
  invalidateSlaPolicies();
  return doc;
}

export async function deleteSlaPolicy(
  severity: AlertSeverity
): Promise<boolean> {
  const res = await SlaPolicy.deleteOne({ severity });
  invalidateSlaPolicies();
  return (res.deletedCount ?? 0) > 0;
}