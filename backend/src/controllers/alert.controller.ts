import type { Request, Response } from "express";
import { Types } from "mongoose";
import Alert from "../models/Alert.js";
import WorkflowState from "../models/WorkflowState.js";
import { buildScope } from "../utils/roleScope.js";
import { logAction } from "../services/auditLogger.js";
import { emitAlertEvent } from "../sockets/index.js";
import { ALERT_DEADLINES } from "../types/index.js";
import type { ListAlertsQuery } from "../validators/query.validator.js";
import type { EscalateAlertInput } from "../validators/alert.validator.js";

// ── GET /api/v1/alerts ─────────────────────────────────────────────────────
// Filterable list of alerts. Mine official scoped to own site;
// corporate/regulator see all. Field officer blocked at route level.

export const listAlerts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListAlertsQuery;
    const scope = buildScope(req, "alert"); // scope.siteId for mine_official

    const filter: Record<string, unknown> = { ...scope };

    // Site-scoped users (mine_official) must never override their scope with
    // a client-supplied ?siteId= — that would leak another site's alerts.
    if (!filter.siteId && q.siteId) filter.siteId = q.siteId;
    if (q.severity) filter.severity = q.severity;
    if (q.ruleCode) filter.ruleCode = q.ruleCode;
    if (q.status)   filter.status = q.status;

    const limit = q.limit;

    const rows = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("siteId", "name")
      .populate("assignedTo", "name")
      .lean();

    const data = rows.map((r) => {
      // siteId is populated (lean), so it's a { _id, name } ref, not a bare ObjectId
      const siteRef = (r.siteId as unknown as { _id?: string; name?: string }) ?? {};
      return {
        id: (r._id as unknown as string).toString(),
        siteId: (siteRef._id ?? (r.siteId as unknown as string)).toString(),
        siteName: siteRef.name ?? "Unknown",
        sourceType: r.sourceType,
        ruleCode: r.ruleCode,
        severity: r.severity,
        status: r.status,
        assignedToName: (r.assignedTo as unknown as { name: string })?.name ?? "Unassigned",
        // ── Feature 02: escalation ladder surfaced to the UI ─────────────────
        assignedRole: r.assignedRole ?? null,
        currentLevel: r.currentLevel ?? 1,
        escalationCount: r.escalationCount ?? 0,
        lastEscalatedAt: r.lastEscalatedAt ?? null,
        acknowledgedAt: r.acknowledgedAt ?? null,
        ackDeadline: r.ackDeadline ?? null,
        resolutionDeadline: r.resolutionDeadline ?? null,
        slaSnapshot: r.slaSnapshot
          ? {
              ackSla: r.slaSnapshot.ackSla,
              resolutionSla: r.slaSnapshot.resolutionSla,
              escalationChain: r.slaSnapshot.escalationChain.map((l) => ({
                level: l.level,
                role: l.role,
                waitMinutes: l.waitMinutes,
              })),
            }
          : null,
        // ── Feature 04: recurrence pattern enrichment ────────────────────────
        category: r.category,
        scope: r.scope,
        reportCount: r.reportCount,
        uniqueReporters: r.uniqueReporters,
        reinforcedCount: r.reinforcedCount,
        zoneCount: r.zoneCount,
        sitesAffected: r.sitesAffected,
        firstReportedAt: r.firstReportedAt,
        lastReportedAt: r.lastReportedAt,
        evidence: (r.evidence ?? []).map((e) => ({
          sourceType: e.sourceType,
          sourceId: e.sourceId.toString(),
          reporterId: e.reporterId ? e.reporterId.toString() : undefined,
          capturedAt: e.capturedAt,
        })),
        createdAt: r.createdAt,
      };
    });

    // Exact match count (unlimited) so the frontend can derive an
    // accurate unread/notification tally without pagination metadata.
    const total = await Alert.countDocuments(filter);

    res.json({ data, total, limit });
  } catch (err) {
    console.error("List alerts error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── Escalation guard ─────────────────────────────────────────────────────────
// mine_official may only act on alerts at their own site; corporate_manager and
// regulator may act on any alert. field_officer is blocked at the route level.

function canActOnAlert(req: Request, siteId: Types.ObjectId): boolean {
  const user = req.user;
  if (!user) return false;
  if (user.role === "corporate_manager" || user.role === "regulator") return true;
  if (user.role === "mine_official" && user.siteId) return siteId.toString() === user.siteId;
  return false;
}

async function latestDeadline(alertId: string): Promise<Date | null> {
  const row = await WorkflowState.find({ alertId })
    .sort({ changedAt: -1 })
    .limit(1)
    .lean();
  return row[0]?.deadline ?? null;
}

// ── POST /api/v1/alerts/:id/acknowledge ──────────────────────────────────────
// Halts further auto-escalation. Appends an acknowledged workflow entry so the
// escalation aggregate (latest state per alert) naturally drops it from the
// assigned/reminded/escalated working set. The conditional `status: "open"`
// write makes ack-vs-cron atomic (edge F): if the engine escalated in the
// window between the read and write, the modifiedCount mismatch aborts the ack.

export const acknowledgeAlert = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const alertId = String((req.params as { id?: string }).id ?? "");
    if (!/^[a-f\d]{24}$/i.test(alertId)) {
      res.status(400).json({ error: "Invalid alert id." });
      return;
    }

    const alert = await Alert.findById(alertId).select("siteId severity status currentLevel");
    if (!alert) {
      res.status(404).json({ error: "Alert not found." });
      return;
    }
    if (!canActOnAlert(req, alert.siteId as Types.ObjectId)) {
      res.status(403).json({ error: "Not authorized for this alert." });
      return;
    }
    if (alert.status === "closed" || alert.status === "escalated" || alert.status === "acknowledged") {
      res.status(409).json({ error: `Alert is already ${alert.status}; acknowledging is not allowed.` });
      return;
    }

    const now = new Date();
    const statusRes = await Alert.updateOne(
      { _id: alertId, status: "open" },
      { $set: { status: "acknowledged", acknowledgedAt: now } }
    );
    if (statusRes.modifiedCount !== 1) {
      res.status(409).json({ error: "Alert changed concurrently; acknowledging is not allowed." });
      return;
    }

    const deadline = (await latestDeadline(alertId)) ?? new Date(Date.now() + ALERT_DEADLINES[alert.severity]);
    const { note } = req.body as { note?: string };
    await WorkflowState.create({
      alertId,
      state: "acknowledged",
      level: alert.currentLevel ?? 1,
      deadline,
      changedBy: new Types.ObjectId(req.user!.id),
      note: note ?? null,
    });
    await logAction({
      entityType: "alert",
      entityId: new Types.ObjectId(alertId),
      action: "acknowledged",
      actorId: new Types.ObjectId(req.user!.id),
      payload: { fromStatus: alert.status, note },
    });

    res.json({ alertId, status: "acknowledged" });
  } catch (err) {
    console.error("Acknowledge alert error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/alerts/:id/resolve ──────────────────────────────────────────
// Closes the alert lifecycle. Allowed from open/acknowledged/escalated —
// this is the only path that ends an escalated alert. Conditional status write
// makes resolve-vs-cron atomic (edge F), same as acknowledge above.

export const resolveAlert = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const alertId = String((req.params as { id?: string }).id ?? "");
    if (!/^[a-f\d]{24}$/i.test(alertId)) {
      res.status(400).json({ error: "Invalid alert id." });
      return;
    }

    const alert = await Alert.findById(alertId).select("siteId severity status currentLevel");
    if (!alert) {
      res.status(404).json({ error: "Alert not found." });
      return;
    }
    if (!canActOnAlert(req, alert.siteId as Types.ObjectId)) {
      res.status(403).json({ error: "Not authorized for this alert." });
      return;
    }
    if (alert.status === "closed") {
      res.status(409).json({ error: "Alert is already closed." });
      return;
    }

    const statusRes = await Alert.updateOne(
      { _id: alertId, status: { $in: ["open", "acknowledged", "escalated"] } },
      { $set: { status: "closed", resolvedAt: new Date() } }
    );
    if (statusRes.modifiedCount !== 1) {
      res.status(409).json({ error: "Alert changed concurrently; resolving is not allowed." });
      return;
    }

    const deadline = (await latestDeadline(alertId)) ?? new Date(Date.now() + ALERT_DEADLINES[alert.severity]);
    const { resolutionNote } = req.body as { resolutionNote?: string };
    await WorkflowState.create({
      alertId,
      state: "resolved",
      level: alert.currentLevel ?? 1,
      deadline,
      changedBy: new Types.ObjectId(req.user!.id),
      note: resolutionNote ?? null,
    });
    await logAction({
      entityType: "alert",
      entityId: new Types.ObjectId(alertId),
      action: "resolved",
      actorId: new Types.ObjectId(req.user!.id),
      payload: { fromStatus: alert.status, resolutionNote },
    });

    res.json({ alertId, status: "closed" });
  } catch (err) {
    console.error("Resolve alert error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/alerts/:id/escalate ─────────────────────────────────────────
// Manual escalation — jumps an open/acknowledged alert straight to the
// terminal escalated status (48-hour reset deadline) ahead of the cron engine.
// The cron only acts on assigned/reminded/escalated open alerts, so an
// escalated alert is never re-touched here (its status excludes it from the
// working set). The jump lands on the chain's top rung (feature 02) so the
// alert never climbs further.

const MANUAL_ESCALATION_DEADLINE_MS = 48 * 60 * 60 * 1000;

export const escalateAlert = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const alertId = String((req.params as { id?: string }).id ?? "");
    if (!/^[a-f\d]{24}$/i.test(alertId)) {
      res.status(400).json({ error: "Invalid alert id." });
      return;
    }

    const alert = await Alert.findById(alertId).select("siteId severity status ruleCode currentLevel escalationCount slaSnapshot");
    if (!alert) {
      res.status(404).json({ error: "Alert not found." });
      return;
    }
    if (!canActOnAlert(req, alert.siteId as Types.ObjectId)) {
      res.status(403).json({ error: "Not authorized for this alert." });
      return;
    }
    if (alert.status === "closed") {
      res.status(409).json({ error: "Alert is already closed; escalating is not allowed." });
      return;
    }
    if (alert.status === "escalated") {
      res.status(409).json({ error: "Alert is already escalated." });
      return;
    }

    // Jump to the chain top (feature 02) — a manually escalated alert is at the
    // terminal rung and the engine won't climb it further.
    const chain = alert.slaSnapshot?.escalationChain ?? [];
    const topLevel = Math.max(1, chain.length);

    const statusRes = await Alert.updateOne(
      { _id: alertId, status: { $in: ["open", "acknowledged"] } },
      {
        $set: {
          status: "escalated",
          currentLevel: topLevel,
          assignedRole: chain[chain.length - 1]?.role ?? null,
          escalationCount: (alert.escalationCount ?? 0) + 1,
          lastEscalatedAt: new Date(),
        },
      }
    );
    if (statusRes.modifiedCount !== 1) {
      res.status(409).json({ error: "Alert changed concurrently; escalating is not allowed." });
      return;
    }

    const deadline = new Date(Date.now() + MANUAL_ESCALATION_DEADLINE_MS);
    await WorkflowState.create({
      alertId,
      state: "escalated",
      level: topLevel,
      deadline,
      changedBy: new Types.ObjectId(req.user!.id),
    });

    const { note } = req.body as EscalateAlertInput;
    await logAction({
      entityType: "alert",
      entityId: new Types.ObjectId(alertId),
      action: "escalated",
      actorId: new Types.ObjectId(req.user!.id),
      payload: { fromStatus: alert.status, note },
    });

    emitAlertEvent("alert:escalated", (alert.siteId as Types.ObjectId).toString(), {
      alertId,
      ruleCode: alert.ruleCode,
      severity: alert.severity,
      status: "escalated",
      note,
    });

    res.json({ alertId, status: "escalated", deadline });
  } catch (err) {
    console.error("Escalate alert error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
