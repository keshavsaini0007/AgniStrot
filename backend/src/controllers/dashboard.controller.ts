import type { Request, Response } from "express";
import { Types } from "mongoose";
import Site from "../models/Site.js";
import Alert from "../models/Alert.js";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import Attendance from "../models/Attendance.js";
import WorkflowState from "../models/WorkflowState.js";
import { buildScope } from "../utils/roleScope.js";
import { ALERT_DEADLINES, INSPECTION_INTERVALS } from "../types/index.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function todayRange(): { $gte: Date; $lt: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { $gte: start, $lt: end };
}

// ── GET /api/v1/dashboard/summary ──────────────────────────────────────────

export const getSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;

    switch (user.role) {
      case "mine_official":
        return await mineOfficialSummary(user, res);
      case "corporate_manager":
        return await corporateManagerSummary(res);
      case "regulator":
        return await regulatorSummary(res);
      case "field_officer":
        return await fieldOfficerSummary(user, res);
      default:
        res.status(403).json({ error: "Unknown role." });
    }
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── Mine Official ──────────────────────────────────────────────────────────

async function mineOfficialSummary(
  user: { id: string; siteId: string | null },
  res: Response
): Promise<void> {
  if (!user.siteId) {
    res.json({ site: null, openAlerts: [], todaysInspections: [], attendanceToday: { present: 0, absent: 0 }, pendingWorkflows: [] });
    return;
  }

  const siteId = new Types.ObjectId(user.siteId);
  const today = todayRange();

  const [site, openAlerts, todaysInspections, presentWorkers, pendingWorkflows] = await Promise.all([
    Site.findById(siteId).lean(),
    Alert.find({ siteId, status: "open" })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("assignedTo", "name")
      .lean(),
    Inspection.find({ siteId, capturedAt: today })
      .sort({ capturedAt: -1 })
      .limit(10)
      .populate("inspectorId", "name")
      .lean(),
    Attendance.distinct("workerRef", { siteId, capturedAt: today, checkType: "in" }),
    getPendingWorkflows(siteId),
  ]);

  const present = presentWorkers.length;
  const expected = (site as { expectedWorkers?: number })?.expectedWorkers ?? 50;
  const absent = Math.max(0, expected - present);

  res.json({
    site: site
      ? { id: (site._id as unknown as string).toString(), name: site.name, subsidiary: site.subsidiary, expectedWorkers: expected }
      : null,
    openAlerts: openAlerts.map((a) => ({
      id: (a._id as unknown as string).toString(),
      ruleCode: a.ruleCode,
      severity: a.severity,
      assignedToName: (a.assignedTo as unknown as { name: string })?.name ?? "Unassigned",
      createdAt: a.createdAt,
    })),
    todaysInspections: todaysInspections.map((i) => ({
      id: (i._id as unknown as string).toString(),
      type: i.type,
      inspectorName: (i.inspectorId as unknown as { name: string })?.name ?? "Unknown",
      failedCount: i.checklist.filter((c) => c.result === "fail").length,
      capturedAt: i.capturedAt,
    })),
    attendanceToday: { present, absent },
    pendingWorkflows,
  });
}

async function getPendingWorkflows(siteId: Types.ObjectId) {
  const now = new Date();

  // Find open alerts at this site
  const openAlerts = await Alert.find({ siteId, status: { $in: ["open", "acknowledged"] } })
    .select("_id severity")
    .lean();

  if (openAlerts.length === 0) return [];

  const alertIds = openAlerts.map((a) => a._id);

  // Get the latest workflow state per alert
  const latestStates = await WorkflowState.aggregate([
    { $match: { alertId: { $in: alertIds } } },
    { $sort: { changedAt: -1 } },
    { $group: { _id: "$alertId", state: { $first: "$state" }, deadline: { $first: "$deadline" } } },
  ]);

  return latestStates
    .filter((ws) => ws.state !== "escalated" && ws.state !== "resolved" && ws.state !== "acknowledged")
    .map((ws) => {
      const alert = openAlerts.find((a) => (a._id as unknown as string).toString() === (ws._id as unknown as string).toString());
      const deadlineMs = ALERT_DEADLINES[alert?.severity ?? "medium"];
      const deadline = new Date((ws.deadline as Date).getTime());
      return {
        alertId: (ws._id as unknown as string).toString(),
        state: ws.state,
        deadline,
        overdue: now > deadline,
      };
    });
}

// ── Corporate Manager ──────────────────────────────────────────────────────

async function corporateManagerSummary(res: Response): Promise<void> {
  const today = todayRange();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [sites, criticalAlerts, trendData] = await Promise.all([
    Site.find({}).lean(),
    Alert.find({ severity: "critical", status: "open" })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("siteId", "name")
      .lean(),
    Alert.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Per-site alert counts
  const siteAlertCounts = await Alert.aggregate([
    { $match: { status: "open" } },
    { $group: { _id: "$siteId", openCount: { $sum: 1 }, criticalCount: { $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] } } } },
  ]);

  const siteCountMap = new Map(
    siteAlertCounts.map((s) => [s._id.toString(), { open: s.openCount, critical: s.criticalCount }])
  );

  // Build 7-day series
  const daily: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = trendData.find((t) => t._id === key);
    daily.push({ date: key, count: found?.count ?? 0 });
  }

  const totals = {
    alerts: daily.reduce((sum, d) => sum + d.count, 0),
    sites: sites.length,
  };

  res.json({
    sites: sites.map((s) => {
      const counts = siteCountMap.get((s._id as unknown as string).toString()) ?? { open: 0, critical: 0 };
      return {
        id: (s._id as unknown as string).toString(),
        name: s.name,
        subsidiary: s.subsidiary,
        openAlertsCount: counts.open,
        criticalAlertsCount: counts.critical,
      };
    }),
    criticalAlerts: criticalAlerts.map((a) => ({
      id: (a._id as unknown as string).toString(),
      siteName: (a.siteId as unknown as { name: string })?.name ?? "Unknown",
      ruleCode: a.ruleCode,
      severity: a.severity,
      status: a.status,
      createdAt: a.createdAt,
    })),
    trend7Day: { daily, totals },
  });
}

// ── Regulator ──────────────────────────────────────────────────────────────

async function regulatorSummary(res: Response): Promise<void> {
  const now = new Date();

  const [sites, criticalAlertCounts, overdueData] = await Promise.all([
    Site.find({}).lean(),
    Alert.aggregate([
      { $match: { severity: "critical", status: "open" } },
      { $group: { _id: "$siteId", count: { $sum: 1 } } },
    ]),
    Inspection.aggregate([
      { $sort: { capturedAt: -1 } },
      { $group: { _id: { siteId: "$siteId", type: "$type" }, lastDate: { $first: "$capturedAt" } } },
    ]),
  ]);

  const criticalCountMap = new Map(
    criticalAlertCounts.map((c) => [c._id.toString(), c.count])
  );

  // Check overdue inspections per site/type
  const overdueItems: { siteId: string; siteName: string; type: string; since: Date }[] = [];
  for (const site of sites) {
    for (const [type, interval] of Object.entries(INSPECTION_INTERVALS) as [string, number][]) {
      const key = `${(site._id as unknown as string).toString()}_${type}`;
      const last = overdueData.find((d) => d._id.siteId.toString() === (site._id as unknown as string).toString() && d._id.type === type);
      const lastDate = last?.lastDate as Date | undefined;
      if (!lastDate || now.getTime() - lastDate.getTime() > interval) {
        overdueItems.push({
          siteId: (site._id as unknown as string).toString(),
          siteName: site.name,
          type,
          since: lastDate ?? new Date(0),
        });
      }
    }
  }

  res.json({
    sites: sites.map((s) => ({
      id: (s._id as unknown as string).toString(),
      name: s.name,
      subsidiary: s.subsidiary,
      openCriticalCount: criticalCountMap.get((s._id as unknown as string).toString()) ?? 0,
      lastInspectionDate: overdueData
        .filter((d) => d._id.siteId.toString() === (s._id as unknown as string).toString())
        .sort((a, b) => (b.lastDate as Date).getTime() - (a.lastDate as Date).getTime())[0]?.lastDate ?? null,
    })),
    overdueItems,
  });
}

// ── Field Officer ──────────────────────────────────────────────────────────

async function fieldOfficerSummary(
  user: { id: string },
  res: Response
): Promise<void> {
  const [myInspections, myIncidents] = await Promise.all([
    Inspection.find({ inspectorId: new Types.ObjectId(user.id) })
      .sort({ capturedAt: -1 })
      .limit(10)
      .populate("inspectorId", "name")
      .lean(),
    Incident.find({ reportedBy: new Types.ObjectId(user.id) })
      .sort({ capturedAt: -1 })
      .limit(10)
      .populate("reportedBy", "name")
      .lean(),
  ]);

  res.json({
    myInspections: myInspections.map((i) => ({
      id: (i._id as unknown as string).toString(),
      siteId: (i.siteId as unknown as string).toString(),
      type: i.type,
      inspectorName: (i.inspectorId as unknown as { name: string })?.name ?? "Unknown",
      failedCount: i.checklist.filter((c) => c.result === "fail").length,
      capturedAt: i.capturedAt,
    })),
    myIncidents: myIncidents.map((i) => ({
      id: (i._id as unknown as string).toString(),
      siteId: (i.siteId as unknown as string).toString(),
      severity: i.severity,
      category: i.category,
      status: i.status,
      reportedByName: (i.reportedBy as unknown as { name: string })?.name ?? "Unknown",
      capturedAt: i.capturedAt,
    })),
  });
}
