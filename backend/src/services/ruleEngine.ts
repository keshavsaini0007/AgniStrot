import { Types } from "mongoose";
import Alert from "../models/Alert.js";
import User from "../models/User.js";
import WorkflowState from "../models/WorkflowState.js";
import type {
  SourceType,
  AlertSeverity,
  AlertStatus,
  WorkflowState as WorkflowStateType,
  RuleCode,
} from "../types/index.js";
import { ALERT_DEADLINES } from "../types/index.js";

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
// Three-level fallback to find a valid mine_official to assign the alert to.
// Returns null only if no mine_official exists anywhere in the system.

export async function resolveAssignee(
  siteId: Types.ObjectId
): Promise<Types.ObjectId | null> {
  // Level 1: mine_official for this specific site
  const siteAssignee = await User.findOne({ siteId, role: "mine_official" }).select("_id");
  if (siteAssignee) return siteAssignee._id;

  // Level 2: any mine_official in the system (different site)
  const anyAssignee = await User.findOne({ role: "mine_official" }).select("_id");
  if (anyAssignee) return anyAssignee._id;

  // Level 3: no mine_official exists — caller must handle this
  return null;
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function evaluateRules(
  sourceType: SourceType,
  sourceId: Types.ObjectId,
  siteId: Types.ObjectId,
  record: Record<string, unknown>
): Promise<void> {
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

  for (const rule of ruleResults) {
    if (!rule.triggered || !rule.ruleCode || !rule.severity) continue;

    // ── Resolve assignee BEFORE attempting alert creation ──────────────────
    // Fix Issue 5: never store a dangling reference (sourceId as assignedTo)
    const assignedTo = await resolveAssignee(siteId);
    if (!assignedTo) {
      console.warn(
        `[ruleEngine] No mine_official found for site ${siteId.toString()}. ` +
        `Skipping alert for rule ${rule.ruleCode}.`
      );
      continue;
    }

    // ── Atomic upsert — fix Issue 4 race condition ─────────────────────────
    // findOneAndUpdate with upsert is atomic: one request wins, the rest see
    // lastErrorObject.upserted = undefined and skip workflow creation.
    const alertResult = await Alert.findOneAndUpdate(
      { sourceId, ruleCode: rule.ruleCode },
      {
        $setOnInsert: {
          siteId,
          sourceType,
          sourceId,
          ruleCode: rule.ruleCode,
          severity: rule.severity,
          status: "open" as AlertStatus,
          assignedTo,
        },
      },
      { upsert: true, new: true, includeResultMetadata: true }
    );

    // If upserted is falsy, the alert already existed — skip workflow creation
    if (!alertResult.lastErrorObject?.upserted) continue;

    const alertId = alertResult.value?._id as Types.ObjectId;
    if (!alertId) continue;

    const deadlineMs = ALERT_DEADLINES[rule.severity];
    const deadline = new Date(Date.now() + deadlineMs);

    await WorkflowState.create({
      alertId,
      state: "assigned" as WorkflowStateType,
      deadline,
    });

    console.log(
      `[ruleEngine] Alert created — rule: ${rule.ruleCode}, ` +
      `severity: ${rule.severity}, site: ${siteId.toString()}`
    );
  }
}
