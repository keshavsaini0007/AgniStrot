import type { Request, Response } from "express";
import Alert from "../models/Alert.js";
import WorkflowState from "../models/WorkflowState.js";
import { buildScope } from "../utils/roleScope.js";
import { ALERT_DEADLINES } from "../types/index.js";
import type { ListCorrectiveActionsQuery } from "../validators/correctiveAction.validator.js";
import type { IAlert } from "../types/index.js";

// ── Corrective Actions feed ──────────────────────────────────────────────────
// Derived entirely from Alerts + workflow history — there is no separate
// correctness collection. A "corrective action" is an open/resolved alert with:
//   priority   = alert severity (low→low … critical→urgent)
//   status     = projection of alert status + latest workflow state
//   dueDate    = latest workflow deadline (falls back to severity deadline)
//   verifiedBy = the user who resolved it (latest resolved workflow entry)
//   resolutionNote = note persisted on the resolved workflow entry
// This keeps the module honest: every corrective action traces back to a
// rule-generated alert, and every resolution carries audit evidence.

type CorrectiveStatus =
  | "reported"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "verified"
  | "rejected"
  | "closed";

export type CorrectiveActionDto = {
  id: string;
  siteId: string;
  siteName: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: CorrectiveStatus;
  department: string;
  assignedTo: string;
  dueDate: Date;
  resolutionNote?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const SEVERITY_TO_PRIORITY: Record<IAlert["severity"], CorrectiveActionDto["priority"]> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "urgent",
};

const SOURCE_TO_DEPARTMENT: Record<string, string> = {
  inspection: "Mine Operations",
  incident: "Safety",
  attendance: "Labour & Welfare",
};

function titleCase(ruleCode: string): string {
  return ruleCode
    .replace(/_+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveStatus(alertStatus: IAlert["status"], workflowState?: string): CorrectiveStatus {
  if (alertStatus === "closed" || workflowState === "resolved") return "resolved";
  if (alertStatus === "escalated") return "in_progress";
  if (alertStatus === "acknowledged") return "in_progress";
  return "assigned"; // open — not yet acknowledged
}

type WorkflowLean = {
  alertId: unknown;
  state: string;
  deadline?: Date;
  changedAt: Date;
  changedBy?: { name?: string } | null;
  note?: string | null;
};

function toCorrectiveDto(
  alert: {
    _id: unknown;
    siteId: unknown;
    sourceType: string;
    ruleCode: string;
    severity: IAlert["severity"];
    status: IAlert["status"];
    createdAt: Date;
  },
  siteName: string,
  assignedToName: string,
  wf?: WorkflowLean
): CorrectiveActionDto {
  const dto: CorrectiveActionDto = {
    id: String(alert._id),
    siteId: String(alert.siteId),
    siteName,
    title: `${titleCase(alert.ruleCode)} — ${siteName}`,
    description: `Detected via ${alert.sourceType} compliance rule.`,
    priority: SEVERITY_TO_PRIORITY[alert.severity],
    status: deriveStatus(alert.status, wf?.state),
    department: SOURCE_TO_DEPARTMENT[alert.sourceType] ?? "Compliance",
    assignedTo: assignedToName,
    dueDate: wf?.deadline ?? new Date(Date.now() + ALERT_DEADLINES[alert.severity]),
    createdAt: alert.createdAt,
    updatedAt: wf?.changedAt ?? alert.createdAt,
  };

  if (wf?.note) dto.resolutionNote = wf.note;
  if (wf?.state === "resolved") {
    if (wf.changedBy?.name) dto.verifiedBy = wf.changedBy.name;
    dto.verifiedAt = wf.changedAt;
  }
  return dto;
}

async function latestWorkflow(alertId: string): Promise<WorkflowLean | undefined> {
  const row = await WorkflowState.find({ alertId })
    .sort({ changedAt: -1 })
    .limit(1)
    .populate("changedBy", "name")
    .lean();
  return (row[0] as unknown as WorkflowLean | undefined) ?? undefined;
}

// ── GET /api/v1/corrective-actions ──────────────────────────────────────────

export const listCorrectiveActions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListCorrectiveActionsQuery;
    const scope = buildScope(req, "alert");

    const filter: Record<string, unknown> = { ...scope };
    if (!filter.siteId && q.siteId) filter.siteId = q.siteId;

    // Explicit default (defensive: zod default-merge through Express 5 query
    // getters is unreliable — F16 revealed NaN page/limit slicing otherwise).
    const limit = q.limit ?? 50;

    const rows = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("siteId", "name")
      .populate("assignedTo", "name")
      .lean();

    const workflowRows = await WorkflowState.find({
      alertId: { $in: rows.map((r) => r._id) },
    })
      .sort({ changedAt: 1 })
      .populate("changedBy", "name")
      .lean();

    // Sorted ascending by changedAt globally, so the last write per alert wins.
    const latestByAlert = new Map<string, WorkflowLean>();
    for (const w of workflowRows) {
      latestByAlert.set(String((w as unknown as { alertId: unknown }).alertId), w as unknown as WorkflowLean);
    }

    let items = rows.map((r) => {
      // siteId is populated (lean) → it's a { _id, name } ref, not a bare ObjectId
      const siteRef = (r.siteId as unknown as { _id?: unknown; name?: string }) ?? {};
      const userRef = (r.assignedTo as unknown as { name?: string }) ?? {};
      return toCorrectiveDto(
        {
          _id: r._id,
          siteId: String(siteRef._id ?? r.siteId),
          sourceType: r.sourceType,
          ruleCode: r.ruleCode,
          severity: r.severity,
          status: r.status,
          createdAt: r.createdAt,
        },
        siteRef.name ?? "Unknown",
        userRef.name ?? "Unassigned",
        latestByAlert.get(String(r._id))
      );
    });

    if (q.status) items = items.filter((i) => i.status === q.status);
    if (q.priority) items = items.filter((i) => i.priority === q.priority);

    res.json({ data: items, total: items.length, limit });
  } catch (err) {
    console.error("List corrective actions error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── GET /api/v1/corrective-actions/:id ───────────────────────────────────────

export const getCorrectiveActionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const alertId = String((req.params as { id?: string }).id ?? "");
    if (!/^[a-f\d]{24}$/i.test(alertId)) {
      res.status(400).json({ error: "Invalid corrective action id." });
      return;
    }

    const scope = buildScope(req, "alert");
    const alert = await Alert.findOne({ _id: alertId, ...scope })
      .populate("siteId", "name")
      .populate("assignedTo", "name")
      .lean();
    if (!alert) {
      res.status(404).json({ error: "Corrective action not found." });
      return;
    }

    const siteRef = (alert.siteId as unknown as { _id?: unknown; name?: string }) ?? {};
    const userRef = (alert.assignedTo as unknown as { name?: string }) ?? {};

    res.json({
      data: toCorrectiveDto(
        {
          _id: alert._id,
          siteId: String(siteRef._id ?? alert.siteId),
          sourceType: alert.sourceType,
          ruleCode: alert.ruleCode,
          severity: alert.severity,
          status: alert.status,
          createdAt: alert.createdAt,
        },
        siteRef.name ?? "Unknown",
        userRef.name ?? "Unassigned",
        await latestWorkflow(alertId)
      ),
    });
  } catch (err) {
    console.error("Get corrective action error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};