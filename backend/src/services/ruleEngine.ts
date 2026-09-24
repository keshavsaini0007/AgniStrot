import { Types, type Model } from "mongoose";
import Alert from "../models/Alert.js";
import User from "../models/User.js";
import WorkflowState from "../models/WorkflowState.js";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import Attendance from "../models/Attendance.js";
import { emitAlertEvent } from "../sockets/index.js";
import { logAction } from "./auditLogger.js";
import type {
  SourceType,
  AlertSeverity,
  AlertStatus,
  WorkflowState as WorkflowStateType,
  RuleCode,
  UserRole,
  Department,
} from "../types/index.js";
import { ALERT_DEADLINES } from "../types/index.js";
import { getSlaSnapshot } from "./slaPolicyService.js";

// ── Rule Engine ─────────────────────────────────────────────────────────────
// Called synchronously after each sync insert.
// Evaluates the record against compliance rules and creates alerts if triggered.

interface RuleResult {
  triggered: boolean;
  ruleCode?: RuleCode;
  severity?: AlertSeverity;
  message?: string;
}

// ── Inspection rules ─────────────────────────────────────────────────────────

function evaluateInspectionRules(record: Record<string, unknown>): RuleResult[] {
  const results: RuleResult[] = [];
  const checklist = record.checklist as { item: string; result: string; notes?: string }[] | undefined;
  const type = record.type as string;

  if (checklist) {
    if (type === "safety") {
      const failedItems = checklist.filter((c) => c.result === "fail");
      if (failedItems.length > 0) {
        results.push({
          triggered: true,
          ruleCode: "SAFETY_CHECKLIST_FAIL",
          severity: "high",
          message: `Safety checklist has ${failedItems.length} failed item(s)`,
        });
      }
    }

    const missingResults = checklist.filter((c) => !c.result);
    if (missingResults.length > 0) {
      results.push({
        triggered: true,
        ruleCode: "MISSING_MANDATORY_FIELD",
        severity: "medium",
        message: `${missingResults.length} checklist item(s) missing result`,
      });
    }
  }

  return results;
}

// ── Incident rules ───────────────────────────────────────────────────────────

function evaluateIncidentRules(record: Record<string, unknown>): RuleResult[] {
  const results: RuleResult[] = [];
  const severity = record.severity as string;

  if (severity === "critical") {
    results.push({
      triggered: true,
      ruleCode: "CRITICAL_INCIDENT",
      severity: "critical",
      message: "Critical incident reported — immediate action required",
    });
  }

  return results;
}

// ── Attendance rules ─────────────────────────────────────────────────────────
// Batch attendance anomaly detection runs via cron (workflowEngine).
// No sync rules for attendance — nothing to check on a single record.

function evaluateAttendanceRules(_record: Record<string, unknown>): RuleResult[] {
  return [];
}

// ── Assignee resolution ──────────────────────────────────────────────────────
// Feature 02 — the escalation matrix climbs through ROLES, not just the
// mine_official for a site. The ladder is:

//   1. active user matching role + site + department (edge H: multi-manager sites)
//   2. active user matching role + site (any department)
//   3. active user matching role anywhere in the system
//   4. null — no one is assignable (edge A); the workflow engine routes the
//      alert to the policy's systemFallbackUserId (edge C) instead.

// Inactive users are never assignable (edge B). Deterministic lowest-_id
// tiebreak keeps resolution stable across runs.

export async function resolveAssignee(
  siteId: Types.ObjectId,
  role: UserRole = "mine_official",
  department?: Department
): Promise<Types.ObjectId | null> {
  const base: Record<string, unknown> = { role, isActive: { $ne: false } };

  if (department) {
    const deptMatch = await User.findOne({ ...base, siteId, department })
      .sort({ _id: 1 })
      .select("_id");
    if (deptMatch) return deptMatch._id;
  }

  const siteMatch = await User.findOne({ ...base, siteId })
    .sort({ _id: 1 })
    .select("_id");
  if (siteMatch) return siteMatch._id;

  const anyMatch = await User.findOne(base).sort({ _id: 1 }).select("_id");
  return anyMatch?._id ?? null;
}

// ── Department derivation ────────────────────────────────────────────────────
// Captured on the alert at creation (edge H) so escalations pick the right
// manager when a site has several people in the escalation role. Derived from
// the source record's type/category (inspection type / incident category);
// attendance anomalies and anything untyped default to operations.

export function departmentForSource(
  sourceType: SourceType,
  record: Record<string, unknown>
): Department {
  const kind = record.type as string | undefined;
  const category = record.category as string | undefined;
  switch (sourceType) {
    case "inspection":
      if (kind === "safety") return "safety";
      if (kind === "environmental") return "environmental";
      if (kind === "production") return "production";
      if (kind === "labour") return "labour";
      return "operations";
    case "incident":
      if (category === "safety") return "safety";
      if (category === "environmental") return "environmental";
      if (category === "equipment") return "production";
      return "operations";
    default:
      return "operations";
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function evaluateRules(
  sourceType: SourceType,
  sourceId: Types.ObjectId,
  siteId: Types.ObjectId,
  record: Record<string, unknown>
): Promise<void> {
  // Edge E (event-driven): the triggering record may have been deleted after
  // its event was queued (e.g. an incident raised and removed before the outbox
  // worker ran). Never create alerts/audit for a record that no longer exists.
  const sourceModels: Record<SourceType, Model<any>> = {
    inspection: Inspection,
    incident: Incident,
    attendance: Attendance,
  };
  const sourceModel = sourceModels[sourceType];
  if (sourceModel) {
    const exists = await sourceModel.exists({ _id: sourceId });
    if (!exists) {
      console.warn(
        `[ruleEngine] Source ${sourceType}:${sourceId.toString()} not found — skipping rule evaluation.`
      );
      return;
    }
  }

  let ruleResults: RuleResult[] = [];

  switch (sourceType) {
    case "inspection":
      ruleResults = evaluateInspectionRules(record);
      break;
    case "incident":
      ruleResults = evaluateIncidentRules(record);
      break;
    case "attendance":
      ruleResults = evaluateAttendanceRules(record);
      break;
  }

  const department = departmentForSource(sourceType, record);

  for (const rule of ruleResults) {
    if (!rule.triggered || !rule.ruleCode || !rule.severity) continue;

    // ── Resolve assignee BEFORE attempting alert creation ──────────────────
    // Fix Issue 5: never store a dangling reference (sourceId as assignedTo)
    const assignedTo = await resolveAssignee(siteId, "mine_official", department);
    if (!assignedTo) {
      console.warn(
        `[ruleEngine] No mine_official found for site ${siteId.toString()}. ` +
        `Skipping alert for rule ${rule.ruleCode}.`
      );
      continue;
    }

    // ── SLA snapshot at creation (edge G) ──────────────────────────────────
    // The engine reads THIS snapshot (never the live policy), so later policy
    // edits do not retroactively move this alert's deadlines. ackDeadline /
    // resolutionDeadline come from the same snapshot.
    const snapshot = await getSlaSnapshot(rule.severity);
    const now = Date.now();

    // ── Atomic upsert — one request wins, the rest see ─────────────────────
    // lastErrorObject.upserted = undefined and skip workflow creation.
    // Dedup key = "sync:<sourceId>:<ruleCode>" — unique per record+rule.
    const alertRuleKey = `sync:${sourceId.toString()}:${rule.ruleCode}`;
    const alertResult = await Alert.findOneAndUpdate(
      { ruleKey: alertRuleKey },
      {
        $setOnInsert: {
          siteId,
          sourceType,
          sourceId,
          ruleKey: alertRuleKey,
          ruleCode: rule.ruleCode,
          severity: rule.severity,
          status: "open" as AlertStatus,
          assignedTo,
          assignedRole: (snapshot.escalationChain[0]?.role ?? "mine_official") as UserRole,
          slaSnapshot: snapshot,
          ackDeadline: new Date(now + snapshot.ackSla * 60 * 1000),
          resolutionDeadline: new Date(now + snapshot.resolutionSla * 60 * 1000),
          currentLevel: 1,
          escalationCount: 0,
          lastEscalatedAt: null,
          department,
        },
      },
      { upsert: true, returnDocument: "after", includeResultMetadata: true }
    );

    // If upserted is falsy, the alert already existed — skip workflow creation
    if (!alertResult.lastErrorObject?.upserted) continue;

    const alertId = alertResult.value?._id as Types.ObjectId;
    if (!alertId) continue;

    // Level-1 rung deadline = first chain rung (mirrors legacy ALERT_DEADLINES
    // when the chain is at its default).
    const chain0 = snapshot.escalationChain[0];
    const waitMinutes = chain0?.waitMinutes ?? ALERT_DEADLINES[rule.severity] / 60000;
    const deadline = new Date(now + waitMinutes * 60 * 1000);

    await WorkflowState.create({
      alertId,
      state: "assigned" as WorkflowStateType,
      level: 1,
      deadline,
    });

    emitAlertEvent("alert:new", siteId.toString(), {
      alertId: alertId.toString(),
      ruleCode: rule.ruleCode,
      severity: rule.severity,
      siteId: siteId.toString(),
    });

    await logAction({
      entityType: "alert",
      entityId: alertId,
      action: "created",
      payload: {
        ruleCode: rule.ruleCode,
        severity: rule.severity,
        siteId: siteId.toString(),
        sourceType,
        sourceId: sourceId.toString(),
      },
    });

    console.log(
      `[ruleEngine] Alert created — rule: ${rule.ruleCode}, ` +
      `severity: ${rule.severity}, site: ${siteId.toString()}`
    );
  }
}
