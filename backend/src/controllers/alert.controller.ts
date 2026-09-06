import type { Request, Response } from "express";
import { Types } from "mongoose";
import Alert from "../models/Alert.js";
import WorkflowState from "../models/WorkflowState.js";
import { buildScope } from "../utils/roleScope.js";
import { logAction } from "../services/auditLogger.js";
import { ALERT_DEADLINES } from "../types/index.js";
import type { ListAlertsQuery } from "../validators/query.validator.js";

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
        createdAt: r.createdAt,
      };
    });

    res.json({ data });
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
// assigned/reminded working set.

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

    const alert = await Alert.findById(alertId).select("siteId severity status");
    if (!alert) {
      res.status(404).json({ error: "Alert not found." });
      return;
    }
    if (!canActOnAlert(req, alert.siteId as Types.ObjectId)) {
      res.status(403).json({ error: "Not authorized for this alert." });
      return;
    }
    if (alert.status === "closed" || alert.status === "escalated") {
      res.status(409).json({ error: `Alert is already ${alert.status}; acknowledging is not allowed.` });
      return;
    }

    const deadline = (await latestDeadline(alertId)) ?? new Date(Date.now() + ALERT_DEADLINES[alert.severity]);
    await WorkflowState.create({
      alertId,
      state: "acknowledged",
      deadline,
      changedBy: new Types.ObjectId(req.user!.id),
    });
    await Alert.updateOne({ _id: alertId }, { status: "acknowledged" });

    const { note } = req.body as { note?: string };
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
// this is the only path that ends an escalated alert.

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

    const alert = await Alert.findById(alertId).select("siteId severity status");
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

    const deadline = (await latestDeadline(alertId)) ?? new Date(Date.now() + ALERT_DEADLINES[alert.severity]);
    await WorkflowState.create({
      alertId,
      state: "resolved",
      deadline,
      changedBy: new Types.ObjectId(req.user!.id),
    });
    await Alert.updateOne({ _id: alertId }, { status: "closed" });

    const { resolutionNote } = req.body as { resolutionNote?: string };
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
