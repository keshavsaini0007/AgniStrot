import { Types } from "mongoose";
import Site from "../models/Site.js";
import Alert from "../models/Alert.js";
import Inspection from "../models/Inspection.js";
import Attendance from "../models/Attendance.js";
import { resolveAssignee } from "./ruleEngine.js";
import { INSPECTION_INTERVALS, ALERT_DEADLINES } from "../types/index.js";
import type {
  InspectionType,
  AlertSeverity,
  AlertStatus,
  WorkflowState as WorkflowStateType,
} from "../types/index.js";
import WorkflowState from "../models/WorkflowState.js";

// ── Batch Rule Engine ───────────────────────────────────────────────────────
// Runs on a cron schedule. Unlike sync rules (which evaluate a single record),
// these rules derive alerts from aggregated/historical data:
//   - OVERDUE_INSPECTION   : mandated inspection window lapsed for site+type
//   - ATTENDANCE_ANOMALY   : today's check-ins deviate >30% from 14-day average
//   - REPEAT_VIOLATION     : same rule fired 3+ times for a site in 30 days
//
// Alert creation is atomic + idempotent via the ruleKey sparse unique index.

// ── Overdue inspection ──────────────────────────────────────────────────────

async function checkOverdueInspections(): Promise<void> {
  const sites = await Site.find({}).select("_id name").lean();
  const now = new Date();

  for (const site of sites) {
    // Last inspection capturedAt per type for this site
    const lastByType = await Inspection.aggregate([
      { $match: { siteId: site._id } },
      { $sort: { capturedAt: -1 } },
      { $group: { _id: "$type", lastDate: { $first: "$capturedAt" } } },
    ]);

    const lastMap = new Map<string, Date>(
      lastByType.map((row) => [row._id as string, row.lastDate as Date])
    );

    for (const type of Object.keys(INSPECTION_INTERVALS) as InspectionType[]) {
      const interval = INSPECTION_INTERVALS[type];
      const lastDate = lastMap.get(type);
      const isOverdue = !lastDate || now.getTime() - lastDate.getTime() > interval;

      if (!isOverdue) continue;

      await createBatchAlert({
        siteId: site._id,
        sourceType: "inspection",
        ruleCode: "OVERDUE_INSPECTION",
        severity: "high",
        ruleKey: `overdue:${site._id.toString()}:${type}`,
      });
    }
  }
}

// ── Attendance anomaly ──────────────────────────────────────────────────────

async function checkAttendanceAnomaly(): Promise<void> {
  const sites = await Site.find({}).select("_id").lean();
  const now = new Date();

  // Today's date range
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // 14-day window BEFORE today (previous 14 days, excluding today)
  const historyStart = new Date(todayStart);
  historyStart.setDate(historyStart.getDate() - 14);

  for (const site of sites) {
    const [todayCount, historyCount, historyDays] = await Promise.all([
      Attendance.countDocuments({
        siteId: site._id,
        capturedAt: { $gte: todayStart, $lt: todayEnd },
        checkType: "in",
      }),
      Attendance.countDocuments({
        siteId: site._id,
        capturedAt: { $gte: historyStart, $lt: todayStart },
        checkType: "in",
      }),
      Attendance.distinct(
        "capturedAt",
        {
          siteId: site._id,
          capturedAt: { $gte: historyStart, $lt: todayStart },
          checkType: "in",
        }
      ),
    ]);

    if (historyCount === 0) continue; // no baseline to compare
    const dailyAverage = historyCount / Math.max(historyDays.length, 1);
    if (dailyAverage === 0) continue;

    const deviation = (todayCount - dailyAverage) / dailyAverage;
    if (Math.abs(deviation) <= 0.3) continue; // within ±30% — fine

    await createBatchAlert({
      siteId: site._id,
      sourceType: "attendance",
      ruleCode: "ATTENDANCE_ANOMALY",
      severity: "medium",
      ruleKey: `anomaly:${site._id.toString()}:${todayStart.toISOString().slice(0, 10)}`,
    });
  }
}

// ── Repeat violation ────────────────────────────────────────────────────────

async function checkRepeatViolations(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Group alerts from the last 30 days by (siteId, ruleCode)
  const groups = await Alert.aggregate([
    { $match: { createdAt: { $gte: cutoff } } },
    {
      $group: {
        _id: { siteId: "$siteId", ruleCode: "$ruleCode" },
        count: { $sum: 1 },
        // pick the most recent trigger alert as the source for traceability
        latestSourceId: { $last: "$sourceId" },
        latestSourceType: { $last: "$sourceType" },
      },
    },
    { $match: { count: { $gte: 3 } } },
  ]);

  for (const group of groups) {
    const siteId = group._id.siteId as Types.ObjectId;
    const ruleCode = group._id.ruleCode as string;
    // Only flag pattern repeats of record-backed rules (not other batch rules)
    if (
      ruleCode === "OVERDUE_INSPECTION" ||
      ruleCode === "ATTENDANCE_ANOMALY" ||
      ruleCode === "REPEAT_VIOLATION"
    ) {
      continue;
    }

    await createBatchAlert({
      siteId: siteId as Types.ObjectId,
      sourceType: (group.latestSourceType as "inspection" | "incident" | "attendance") ?? "inspection",
      ruleCode: "REPEAT_VIOLATION",
      severity: "high",
      ruleKey: `repeat:${siteId.toString()}:${ruleCode}`,
    });
  }
}

// ── Shared: create a batch alert (atomically, idempotent) ──────────────────

interface BatchAlertInput {
  siteId: Types.ObjectId;
  sourceType: "inspection" | "incident" | "attendance";
  ruleCode: "OVERDUE_INSPECTION" | "ATTENDANCE_ANOMALY" | "REPEAT_VIOLATION";
  severity: AlertSeverity;
  ruleKey: string;
}

async function createBatchAlert(input: BatchAlertInput): Promise<void> {
  const assignedTo = await resolveAssignee(input.siteId);
  if (!assignedTo) {
    console.warn(
      `[batchRules] No mine_official found for site ${input.siteId.toString()}. ` +
      `Skipping ${input.ruleCode} alert.`
    );
    return;
  }

  const result = await Alert.findOneAndUpdate(
    { ruleKey: input.ruleKey },
    {
      $setOnInsert: {
        siteId: input.siteId,
        sourceType: input.sourceType,
        ruleKey: input.ruleKey,
        ruleCode: input.ruleCode,
        severity: input.severity,
        status: "open" as AlertStatus,
        assignedTo,
      },
    },
    { upsert: true, new: true, includeResultMetadata: true }
  );

  if (!result.lastErrorObject?.upserted) return; // already exists — do nothing

  const alertId = result.value?._id as Types.ObjectId | undefined;
  if (!alertId) return;

  const deadlineMs = ALERT_DEADLINES[input.severity];
  await WorkflowState.create({
    alertId,
    state: "assigned" as WorkflowStateType,
    deadline: new Date(Date.now() + deadlineMs),
  });

  console.log(
    `[batchRules] Alert created — rule: ${input.ruleCode}, ` +
    `key: ${input.ruleKey}, severity: ${input.severity}`
  );
}

// ── Main entry point ────────────────────────────────────────────────────────

export async function runBatchRules(): Promise<void> {
  await checkOverdueInspections();
  await checkAttendanceAnomaly();
  await checkRepeatViolations();
  console.log("[batchRules] Batch rule pass complete.");
}