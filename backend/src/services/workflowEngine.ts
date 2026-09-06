import { Types } from "mongoose";
import WorkflowState from "../models/WorkflowState.js";
import Alert from "../models/Alert.js";
import { ALERT_DEADLINES } from "../types/index.js";
import type {
  WorkflowState as WorkflowStateType,
  AlertSeverity,
} from "../types/index.js";

// ── Workflow Engine ─────────────────────────────────────────────────────────
// Runs on a cron schedule. Drives the alert lifecycle:
//
//   assigned ──deadline passes──▶ reminded ──deadline + 25%──▶ escalated
//
// Once an alert is escalated, it stays escalated until someone (Phase 5)
// resolves or closes it. Each transition is an append-only workflow log entry
// (WorkflowState), so the full journey of an alert is auditable.

// Extra window after the original deadline before a reminded alert escalates.
// = 25% of the severity deadline (proportional: critical escalates sooner).
const ESCALATION_MULTIPLIER = 0.25;

// Latest workflow state per alert, joined with the alert's severity.
const LATEST_STATE_PIPELINE = [
  { $sort: { changedAt: -1 } },
  {
    $group: {
      _id: "$alertId",
      state: { $first: "$state" },
      deadline: { $first: "$deadline" },
    },
  },
  {
    $lookup: {
      from: "alerts",
      localField: "_id",
      foreignField: "_id",
      as: "alert",
    },
  },
  { $addFields: { severity: { $arrayElemAt: ["$alert.severity", 0] } } },
] as const;

export async function runEscalations(): Promise<void> {
  const now = new Date();

  // 1) assigned → reminded: original deadline has passed
  const dueAssigned = await WorkflowState.aggregate([
    ...LATEST_STATE_PIPELINE,
    { $match: { state: "assigned", deadline: { $lt: now } } },
  ]);

  for (const ws of dueAssigned) {
    await escalateWorkflow(ws._id as Types.ObjectId, "reminded");
  }

  // 2) reminded → escalated: deadline + 25% window has passed
  const dueEscalation = await WorkflowState.aggregate([
    ...LATEST_STATE_PIPELINE,
    { $match: { state: "reminded" } },
  ]);

  for (const ws of dueEscalation) {
    const severity = ws.severity as AlertSeverity | undefined;
    if (!severity) continue;
    const deadline = (ws.deadline as Date).getTime();
    const escalateAt = deadline + ALERT_DEADLINES[severity] * ESCALATION_MULTIPLIER;
    if (now.getTime() >= escalateAt) {
      await escalateWorkflow(ws._id as Types.ObjectId, "escalated");
    }
  }

  console.log("[workflowEngine] Escalation pass complete.");
}

// ── Transition helper ───────────────────────────────────────────────────────

async function escalateWorkflow(
  alertId: Types.ObjectId,
  newState: "reminded" | "escalated"
): Promise<void> {
  // Guard: alert must still be un-closed and not already escalated
  const alert = await Alert.findById(alertId).select("status");
  if (!alert) return;
  if (alert.status === "closed" || alert.status === "escalated") return;

  // Guard: latest state must be the expected predecessor (idempotency)
  const latest = await WorkflowState.find({ alertId })
    .sort({ changedAt: -1 })
    .limit(1)
    .lean();
  const current = latest[0];
  if (!current) return;
  const expected = newState === "reminded" ? "assigned" : "reminded";
  if (current.state !== expected) return;

  // Append the transition (never mutate an existing workflow entry)
  await WorkflowState.create({
    alertId,
    state: newState as WorkflowStateType,
    deadline: current.deadline,
  });

  if (newState === "escalated") {
    await Alert.updateOne({ _id: alertId }, { status: "escalated" });
    console.warn(
      `[workflowEngine] Alert ${alertId.toString()} ESCALATED — deadline passed and no action taken.`
    );
  } else {
    console.warn(
      `[workflowEngine] Alert ${alertId.toString()} reminded — deadline passed.`
    );
  }
}