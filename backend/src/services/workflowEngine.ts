import { Types, type PipelineStage } from "mongoose";
import WorkflowState from "../models/WorkflowState.js";
import Alert from "../models/Alert.js";
import { resolveAssignee } from "./ruleEngine.js";
import {
  emitOutboxEvent,
  runInTransaction,
  sessionOption,
} from "./outboxService.js";
import {
  findSystemAdminUserId,
  getSlaPolicyRow,
  getSlaSnapshot,
} from "./slaPolicyService.js";
import type {
  WorkflowState as WorkflowStateType,
  AlertSeverity,
  ISlaSnapshot,
  IEscalationLevel,
  Department,
  UserRole,
} from "../types/index.js";

// ── Workflow Engine ─────────────────────────────────────────────────────────
// Runs on a cron schedule. Drives the multi-level escalation ladder (feature
// 02) against each open alert's SLA SNAPSHOT (captured at creation — edge G):
//
//   assigned(level 1)
//     └─ rung-1 deadline passes ──▶ reminded(level 1)
//        └─ chain[1] due ──▶ escalated(level 2) → RE-ASSIGN to next role
//           └─ chain[2] due ──▶ escalated(level 3) → regulator → status escalated
//              ... the chain top is terminal. Single-level chains escalate at
//              deadline + 25% grace, mirroring the legacy engine exactly.
//
// Each transition is atomic (transaction + conditional `status: "open"` guard,
// so a resolve/ack that races the cron wins — edge F) and appends an auditable
// WorkflowState row stamped with the alert's level. Escalations emit per-level
// outbox events (`alert:<id>:ALERT_ESCALATED:L<level>`) so every rung dedupes
// independently and replays never double-count a level.

// Extra window before the FINAL (top-rung) escalation — legacy parity (25% of
// the top level's wait). Intermediate climbs are timed by the chain offsets.
const GRACE_MULTIPLIER = 0.25;

// How many rungs one drive pass may climb. Chain max length is validated at 5,
// so 6 steps always outrun the ladder (verify shifts createdAt far into the
// past to prove a full climb lands in ONE pass).
const MAX_CLIMB_STEPS = 6;

interface CandidateAlert {
  _id: Types.ObjectId;
  siteId: Types.ObjectId;
  severity: AlertSeverity;
  status: "open"; // guaranteed by the pipeline $match
  createdAt: Date;
  assignedTo: Types.ObjectId;
  slaSnapshot: ISlaSnapshot | null;
  currentLevel: number;
  escalationCount: number;
  department?: Department;
}

interface Candidate {
  _id: Types.ObjectId; // alertId
  state: WorkflowStateType;
  level: number | null;
  deadline: Date | null;
  alert: CandidateAlert;
}

// Latest actionable workflow row per alert, joined with the alert itself.
// The FIRST stage bounds the working set to rows that can move (assigned /
// reminded / escalated) and the final $match drops alerts that are no longer
// open (acknowledged / terminal-escalated / closed never get re-driven).
const ACTIONABLE_PIPELINE: PipelineStage[] = [
  { $match: { state: { $in: ["assigned", "reminded", "escalated"] } } },
  { $sort: { changedAt: -1 } },
  {
    $group: {
      _id: "$alertId",
      state: { $first: "$state" },
      level: { $first: "$level" },
      deadline: { $first: "$deadline" },
    },
  },
  { $lookup: { from: "alerts", localField: "_id", foreignField: "_id", as: "alert" } },
  { $unwind: "$alert" },
  { $match: { "alert.status": "open" } },
];

export async function runEscalations(): Promise<void> {
  const now = new Date();
  const candidates = await WorkflowState.aggregate<Candidate>(ACTIONABLE_PIPELINE).allowDiskUse(true);

  for (const candidate of candidates) {
    await driveCandidate(candidate, now);
  }

  console.log(`[workflowEngine] Escalation pass: ${candidates.length} actionable alert(s).`);
}

// ── Drive one alert through its ladder ───────────────────────────────────────

async function driveCandidate(candidate: Candidate, now: Date): Promise<void> {
  const alert = candidate.alert;
  const snapshot = alert.slaSnapshot ?? (await getSlaSnapshot(alert.severity)); // legacy alerts: live snapshot
  const chain: IEscalationLevel[] = snapshot?.escalationChain ?? [];
  if (chain.length === 0) return;

  const created = alert.createdAt.getTime();
  let state = candidate.state;
  let level = Math.max(1, alert.currentLevel ?? candidate.level ?? 1);
  let deadline = candidate.deadline
    ? new Date(candidate.deadline)
    : new Date(created + chain[0]!.waitMinutes * 60 * 1000);
  const t = now.getTime();
  const alertId = candidate._id;
  let escalationCount = alert.escalationCount ?? 0;

  for (let step = 0; step < MAX_CLIMB_STEPS; step++) {
    // 1) Reminder — the current rung's deadline passed, warn and keep waiting.
    if (state === "assigned") {
      if (t < deadline.getTime()) return;
      const reminded = await writeReminder(alertId, level, deadline, now);
      if (!reminded) return; // raced — another actor changed the alert
      state = "reminded";
    }

    if (state !== "reminded" && state !== "escalated") return;

    const atTop = level >= chain.length;

    if (!atTop) {
      // Next rung is due at createdAt + chain[level].waitMinutes (absolute).
      const next = chain[level]; // 0-based: index = current level, entry = NEXT rung
      if (!next) return;
      const dueNext = created + next.waitMinutes * 60 * 1000;
      if (t < dueNext) return;

      const toLevel = level + 1;
      const terminal = toLevel >= chain.length;
      const ok = await writeClimb(alert, alertId, level, toLevel, terminal, new Date(dueNext), next.role, now, escalationCount + 1);
      if (!ok) return;
      escalationCount += 1;
      if (terminal) return; // reached the top — status is already "escalated"

      state = "escalated";
      level = toLevel;
      deadline = new Date(dueNext);
      continue;
    }

    // Terminal — the top rung's deadline + grace elapsed: mark escalated.
    const topWait = chain[chain.length - 1]!.waitMinutes;
    const graceMs = topWait * 60 * 1000 * GRACE_MULTIPLIER;
    // Base is the rung's ABSOLUTE due time (createdAt + wait), the same source
    // the climb uses — never the possibly-stale row deadline.
    const topDeadline = created + topWait * 60 * 1000;
    if (t < topDeadline + graceMs) return;
    await writeTerminal(alert, alertId, level, new Date(topDeadline), now, escalationCount + 1, chain[chain.length - 1]!.role);
    return;
  }
}

// ── Transitions (each atomic: transaction + status guard) ────────────────────

async function writeReminder(
  alertId: Types.ObjectId,
  level: number,
  deadline: Date,
  now: Date
): Promise<boolean> {
  return runInTransaction(async (session) => {
    // Predecessor guard inside the transaction: only append the reminder if the
    // latest row is still "assigned" (a concurrent ack/resolve drops the alert
    // from the working set before this ever runs).
    const latest = await WorkflowState.findOne({ alertId })
      .sort({ changedAt: -1 })
      .select("state")
      .lean()
      .session(session);
    if (!latest || latest.state !== "assigned") return false;

    await WorkflowState.create(
      [{ alertId, state: "reminded", level, deadline, note: null }],
      { ...sessionOption(session) }
    );

    await emitOutboxEvent(
      {
        type: "ALERT_REMINDED",
        aggregateType: "alert",
        aggregateId: alertId,
        payload: {
          alertId: alertId.toString(),
          fromState: "assigned",
          toState: "reminded",
          level,
          at: now.toISOString(),
        },
      },
      session
    );
    return true;
  });
}

async function writeClimb(
  alert: CandidateAlert,
  alertId: Types.ObjectId,
  fromLevel: number,
  toLevel: number,
  terminal: boolean,
  due: Date,
  nextRole: UserRole,
  now: Date,
  escalationCount: number
): Promise<boolean> {
  // Re-assign to the NEXT rung's role (live resolution honours the alert's
  // department — edge H). No active candidate → the policy's system fallback
  // (edge C), falling back to the seeded System Administrator, then keep the
  // current assignee as the absolute last resort (assignedTo is required).
  let assignee = await resolveAssignee(alert.siteId, nextRole, alert.department);
  let usedFallback = false;
  if (!assignee) {
    const row = await getSlaPolicyRow(alert.severity);
    assignee = row?.systemFallbackUserId ?? (await findSystemAdminUserId());
    usedFallback = !!assignee;
  }
  const nextAssignee = assignee ?? alert.assignedTo;

  return runInTransaction(async (session) => {
    // Race guard (edge F): only climb if the alert is still open. A user's
    // resolve/ack between the query and here wins — the modifiedCount check
    // aborts the climb and the workflow row / outbox event roll back with it.
    const res = await Alert.updateOne(
      { _id: alertId, status: "open" },
      {
        $set: {
          status: terminal ? "escalated" : "open",
          assignedTo: nextAssignee,
          assignedRole: nextRole,
          currentLevel: toLevel,
          escalationCount,
          lastEscalatedAt: now,
        },
      },
      { ...sessionOption(session) }
    );
    if (res.modifiedCount !== 1) return false;

    await WorkflowState.create(
      [
        {
          alertId,
          state: "escalated",
          level: toLevel,
          deadline: due,
          note: usedFallback
            ? "No active candidate for the escalation role — routed to system fallback."
            : null,
        },
      ],
      { ...sessionOption(session) }
    );

    await emitOutboxEvent(
      {
        type: "ALERT_ESCALATED",
        aggregateType: "alert",
        aggregateId: alertId,
        siteId: alert.siteId,
        payload: {
          alertId: alertId.toString(),
          fromLevel,
          toLevel,
          toRole: nextRole,
          terminal,
          fallback: usedFallback,
        },
        // Per-level key so each rung's audit/socket fan-out dedupes on its own
        // transition (a 3-rung climb emits L2 + L3 events independently).
        eventKey: `alert:${alertId.toString()}:ALERT_ESCALATED:L${toLevel}`,
      },
      session
    );
    return true;
  });
}

async function writeTerminal(
  alert: CandidateAlert,
  alertId: Types.ObjectId,
  level: number,
  deadline: Date,
  now: Date,
  escalationCount: number,
  topRole: UserRole
): Promise<void> {
  await runInTransaction(async (session) => {
    const res = await Alert.updateOne(
      { _id: alertId, status: "open" },
      {
        $set: {
          status: "escalated",
          assignedRole: topRole,
          escalationCount,
          lastEscalatedAt: now,
        },
      },
      { ...sessionOption(session) }
    );
    if (res.modifiedCount !== 1) return;

    await WorkflowState.create(
      [
        {
          alertId,
          state: "escalated",
          level,
          deadline,
          note: "Terminal rung reached — awaiting resolution.",
        },
      ],
      { ...sessionOption(session) }
    );

    await emitOutboxEvent(
      {
        type: "ALERT_ESCALATED",
        aggregateType: "alert",
        aggregateId: alertId,
        siteId: alert.siteId,
        payload: {
          alertId: alertId.toString(),
          fromLevel: level,
          toLevel: level,
          toRole: topRole,
          terminal: true,
          fallback: false,
        },
        eventKey: `alert:${alertId.toString()}:ALERT_ESCALATED:L${level}`,
      },
      session
    );
  });
}