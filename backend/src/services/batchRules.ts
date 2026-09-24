import { Types } from "mongoose";
import Site from "../models/Site.js";
import Alert from "../models/Alert.js";
import Inspection from "../models/Inspection.js";
import Attendance from "../models/Attendance.js";
import { resolveAssignee, departmentForSource } from "./ruleEngine.js";
import { getSlaSnapshot } from "./slaPolicyService.js";
import { emitOutboxEvent } from "./outboxService.js";
import { detectRecurringPatterns } from "./recurringHazards.js";
import { checkControlEffectiveness } from "./hazardService.js";
import type { RecurrenceRecord } from "./recurringHazards.js";
import { INSPECTION_INTERVALS, ALERT_DEADLINES } from "../types/index.js";
import type {
  InspectionType,
  AlertSeverity,
  AlertStatus,
  WorkflowState as WorkflowStateType,
  SourceType,
  Department,
  RecurringHazardScope,
  IAlertEvidence,
} from "../types/index.js";
import WorkflowState from "../models/WorkflowState.js";

// ── Batch Rule Engine ───────────────────────────────────────────────────────
// Runs on a cron schedule. Unlike sync rules (which evaluate a single record),
// these rules derive alerts from aggregated/historical data:
//   - OVERDUE_INSPECTION      : mandated inspection window lapsed for site+type
//   - ATTENDANCE_ANOMALY      : today's check-ins deviate >30% from 14-day average
//   - REPEAT_VIOLATION        : same rule fired 3+ times for a site in 30 days
//   - RECURRING_HAZARD        : same canonical hazard, same zone, ≥3 reports from
//                               ≥2 distinct reporters across ≥2 dates (feature 04)
//   - hazard control sweep    : register hazards whose implemented control was
//                               followed by a post-control recurrence are marked
//                               ineffective (feature 06 — checkControlEffectiveness)
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
        department: departmentForSource("inspection", { type }),
      });
    }
  }
}

// ── Attendance anomaly ──────────────────────────────────────────────────────

export async function checkAttendanceAnomaly(): Promise<void> {
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
      department: "operations",
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
      ruleCode === "REPEAT_VIOLATION" ||
      ruleCode === "RECURRING_HAZARD" // feature 04: recurrence is detected by its own rule
    ) {
      continue;
    }

    await createBatchAlert({
      siteId: siteId as Types.ObjectId,
      sourceType: (group.latestSourceType as "inspection" | "incident" | "attendance") ?? "inspection",
      ruleCode: "REPEAT_VIOLATION",
      severity: "high",
      ruleKey: `repeat:${siteId.toString()}:${ruleCode}`,
      // Department derived from the most-recent trigger source (falls back to
      // operations when the source type carries no type/category).
      department: departmentForSource(
        (group.latestSourceType as SourceType) ?? "inspection",
        {}
      ),
    });
  }
}

// ── Shared: create a batch alert (atomically, idempotent) ──────────────────

interface BatchAlertInput {
  siteId: Types.ObjectId;
  sourceType: "inspection" | "incident" | "attendance";
  ruleCode: "OVERDUE_INSPECTION" | "ATTENDANCE_ANOMALY" | "REPEAT_VIOLATION" | "RECURRING_HAZARD";
  severity: AlertSeverity;
  ruleKey: string;
  department?: Department; // edge H — captured so escalations pick the right manager
  extra?: Record<string, unknown>; // feature 04 — merged into $setOnInsert (evidence/scope/...)
}

export async function createBatchAlert(input: BatchAlertInput): Promise<void> {
  const assignedTo = await resolveAssignee(input.siteId, "mine_official", input.department);
  if (!assignedTo) {
    console.warn(
      `[batchRules] No mine_official found for site ${input.siteId.toString()}. ` +
      `Skipping ${input.ruleCode} alert.`
    );
    return;
  }

  // SLA snapshot at creation (edge G) — same policy footprint as sync alerts.
  const snapshot = await getSlaSnapshot(input.severity);
  const now = Date.now();

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
        assignedRole: snapshot.escalationChain[0]?.role ?? "mine_official",
        slaSnapshot: snapshot,
        ackDeadline: new Date(now + snapshot.ackSla * 60 * 1000),
        resolutionDeadline: new Date(now + snapshot.resolutionSla * 60 * 1000),
        currentLevel: 1,
        escalationCount: 0,
        lastEscalatedAt: null,
        department: input.department ?? "operations",
        ...(input.extra ?? {}),
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true }
  );

  if (!result.lastErrorObject?.upserted) return; // already exists — do nothing

  const alertId = result.value?._id as Types.ObjectId | undefined;
  if (!alertId) return;

  const chain0 = snapshot.escalationChain[0];
  const waitMinutes = chain0?.waitMinutes ?? ALERT_DEADLINES[input.severity] / 60000;
  await WorkflowState.create({
    alertId,
    state: "assigned" as WorkflowStateType,
    level: 1,
    deadline: new Date(now + waitMinutes * 60 * 1000),
  });

  // Publish the durable ALERT_CREATED event — the consumer owns the socket
  // fan-out + audit entry (idempotent on the eventKey). Crash between the alert
  // upsert and this emit leaves an alert but no event — the batch cron reruns
  // and the ruleKey upsert dedupes, so the alert itself is not duplicated.
  await emitOutboxEvent({
    type: "ALERT_CREATED",
    aggregateType: "alert",
    aggregateId: alertId,
    siteId: input.siteId,
    payload: {
      ruleCode: input.ruleCode,
      severity: input.severity,
      siteId: input.siteId.toString(),
      derived: true,
    },
  });

  console.log(
    `[batchRules] Alert created — rule: ${input.ruleCode}, ` +
    `key: ${input.ruleKey}, severity: ${input.severity}`
  );
}

// ── Recurring hazard (feature 04) ────────────────────────────────────────────
// Pattern-based detection: same canonical category + radius zone, ≥3 reports
// from ≥2 distinct reporters across ≥2 dates. Detection itself lives in
// recurringHazards.ts (pure reads); this function owns the WRITE lifecycle:
//   - UNRESOLVED (edge A): an open generation absorbs new reports in place —
//     evidence merges (capped), reportCount/uniqueReporters refresh, and
//     reinforcedCount increments. Never a second alert for the same open issue.
//   - REPEAT (edge A): once the open generation is closed, a fresh qualifying
//     pattern starts a NEW generation (ruleKey gains :gen<N>).
//   - Scope (edge E) is re-derived every pass; escalation raises severity.

const RECURRING_EVIDENCE_CAP = 10;

const SCOPE_SEVERITY: Record<RecurringHazardScope, AlertSeverity> = {
  localized: "high",
  "site-wide": "high",
  "category-wide": "critical",
};

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function majoritySourceType(records: RecurrenceRecord[]): "inspection" | "incident" {
  let inspections = 0;
  for (const r of records) if (r.sourceType === "inspection") inspections++;
  return inspections >= records.length / 2 ? "inspection" : "incident";
}

function majorityDepartment(records: RecurrenceRecord[]): Department {
  const counts = new Map<Department, number>();
  for (const r of records) counts.set(r.department, (counts.get(r.department) ?? 0) + 1);
  let best: Department = "operations";
  let bestCount = -1;
  for (const [d, c] of counts) {
    if (c > bestCount) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

function mergeEvidence(
  existing: IAlertEvidence[] | undefined,
  fresh: RecurrenceRecord[],
  cap: number
): IAlertEvidence[] {
  const byKey = new Map<string, IAlertEvidence>();
  for (const e of existing ?? []) byKey.set(`${e.sourceType}:${e.sourceId.toString()}`, e);
  for (const r of fresh) byKey.set(`${r.sourceType}:${r.sourceId.toString()}`, {
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    reporterId: r.reporterId,
    capturedAt: r.capturedAt,
  });
  return [...byKey.values()]
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    .slice(0, cap);
}

export async function checkRecurringHazards(): Promise<void> {
  const patterns = await detectRecurringPatterns();

  for (const pattern of patterns) {
    // REPEAT vs UNRESOLVED (edge case A) — one alert per OPEN generation.
    const existing = await Alert.findOne({
      ruleCode: "RECURRING_HAZARD",
      siteId: pattern.siteId,
      category: pattern.category,
    })
      .sort({ createdAt: -1 })
      .select(
        "status severity scope evidence reportCount uniqueReporters reinforcedCount firstReportedAt lastReportedAt"
      )
      .lean();

    const severity = SCOPE_SEVERITY[pattern.scope];

    if (existing && existing.status !== "closed") {
      // UNRESOLVED — same issue still open, absorb the new reports in place.
      const earlier = existing.firstReportedAt
        ? Math.min(new Date(existing.firstReportedAt).getTime(), pattern.firstReportedAt.getTime())
        : pattern.firstReportedAt.getTime();
      const later = Math.max(
        existing.lastReportedAt ? new Date(existing.lastReportedAt).getTime() : 0,
        pattern.lastReportedAt.getTime()
      );

      const set: Record<string, unknown> = {
        scope: pattern.scope,
        evidence: mergeEvidence(existing.evidence, pattern.records, RECURRING_EVIDENCE_CAP),
        reportCount: pattern.reportCount,
        uniqueReporters: Math.max(existing.uniqueReporters ?? 0, pattern.uniqueReporters),
        zoneCount: pattern.zoneCount,
        sitesAffected: pattern.sitesAffected,
        firstReportedAt: new Date(earlier),
        lastReportedAt: new Date(later),
      };
      // Scope escalation can raise severity (localized → category-wide), never lower it.
      if (SEVERITY_RANK[severity] > SEVERITY_RANK[existing.severity as AlertSeverity]) {
        set.severity = severity;
      }

      await Alert.updateOne({ _id: existing._id }, { $set: set, $inc: { reinforcedCount: 1 } });
      console.log(
        `[batchRules] Recurring hazard UNRESOLVED (reinforced #${(existing.reinforcedCount ?? 0) + 1}) — ` +
        `site ${pattern.siteName}, category ${pattern.category}, ${pattern.reportCount} reports`
      );
      continue;
    }

    // REPEAT — first detection, or a fresh pattern after the previous closure.
    const generation =
      (await Alert.countDocuments({
        ruleCode: "RECURRING_HAZARD",
        siteId: pattern.siteId,
        category: pattern.category,
      })) + 1;

    await createBatchAlert({
      siteId: pattern.siteId,
      sourceType: majoritySourceType(pattern.records),
      ruleCode: "RECURRING_HAZARD",
      severity,
      ruleKey: `recurring:${pattern.siteId.toString()}:${pattern.category}:gen${generation}`,
      department: majorityDepartment(pattern.records),
      extra: {
        category: pattern.category,
        scope: pattern.scope,
        evidence: mergeEvidence(undefined, pattern.records, RECURRING_EVIDENCE_CAP),
        reportCount: pattern.reportCount,
        uniqueReporters: pattern.uniqueReporters,
        zoneCount: pattern.zoneCount,
        sitesAffected: pattern.sitesAffected,
        firstReportedAt: pattern.firstReportedAt,
        lastReportedAt: pattern.lastReportedAt,
      },
    });
  }
}

// ── Main entry point ────────────────────────────────────────────────────────

export async function runBatchRules(): Promise<void> {
  await checkOverdueInspections();
  await checkAttendanceAnomaly();
  await checkRepeatViolations();
  await checkRecurringHazards();
  // Feature 06 D: post-control recurrence sweep — controls proven ineffective
  // by a pattern re-sighting after implementation are downgraded empirically.
  await checkControlEffectiveness();
  console.log("[batchRules] Batch rule pass complete.");
}