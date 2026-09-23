import type { Request, Response } from "express";
import { Types } from "mongoose";
import Alert from "../models/Alert.js";
import WorkflowState from "../models/WorkflowState.js";
import CorrectiveCloseout from "../models/CorrectiveCloseout.js";
import { buildScope } from "../utils/roleScope.js";
import { ALERT_DEADLINES } from "../types/index.js";
import type { IAlert } from "../types/index.js";
import type {
  ListCorrectiveActionsQuery,
  ReviewCloseoutInput,
  SubmitCloseoutInput,
} from "../validators/correctiveAction.validator.js";
import { logAction } from "../services/auditLogger.js";

// ── Corrective Actions feed ──────────────────────────────────────────────────
// Derived from Alerts + workflow history, plus — since feature 08 — a
// persistent close-out record per alert:
//   priority   = alert severity (low→low … critical→urgent)
//   status     = projection of alert status + latest workflow state + close-out
//   dueDate    = latest workflow deadline (falls back to severity deadline)
//   verifiedBy = the user who resolved it (latest resolved workflow entry)
//   resolutionNote = note persisted on the resolved workflow entry
//   closeout   = the feature-08 close-out record (submitted/approved/rejected)
// Every corrective action still traces back to a rule-generated alert; the
// close-out record is the only write path that moves a corrective action to a
// terminal state (approved → "closed", rejected → "rejected").

type CorrectiveStatus =
  | "reported"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "verified"
  | "rejected"
  | "closed";

export type CorrectiveCloseoutDto = {
  status: "submitted" | "approved" | "rejected";
  recommendation: string;
  effectiveness: string;
  evidenceNote?: string;
  submittedBy?: string; // name
  submittedAt: Date;
  reviewedBy?: string; // name
  reviewedAt?: Date;
  reviewNote?: string;
};

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
  closeout?: CorrectiveCloseoutDto;
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

function deriveStatus(
  alertStatus: IAlert["status"],
  workflowState?: string,
  closeoutStatus?: "submitted" | "approved" | "rejected"
): CorrectiveStatus {
  // Close-out state takes precedence — it is a real persisted, audited signal.
  if (closeoutStatus === "approved") return "closed";
  if (closeoutStatus === "rejected") return "rejected";
  if (closeoutStatus === "submitted") return "verified";
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

// Lean close-out row; submittedBy/reviewedBy are either raw ObjectIds or
// populated { name } refs depending on the query path.
type CloseoutLean = {
  status: "submitted" | "approved" | "rejected";
  recommendation: string;
  effectiveness: string;
  evidenceNote?: string | null;
  submittedBy?: { name?: string } | Types.ObjectId | null;
  submittedAt: Date;
  reviewedBy?: { name?: string } | Types.ObjectId | null;
  reviewedAt?: Date | null;
  reviewNote?: string | null;
};

function nameOf(ref: unknown): string | undefined {
  if (ref && typeof ref === "object" && !(ref instanceof Types.ObjectId) && "name" in ref) {
    const n = (ref as { name?: unknown }).name;
    return typeof n === "string" ? n : undefined;
  }
  return undefined;
}

function toCloseoutDto(c: CloseoutLean): CorrectiveCloseoutDto {
  const dto: CorrectiveCloseoutDto = {
    status: c.status,
    recommendation: c.recommendation,
    effectiveness: c.effectiveness,
    submittedAt: c.submittedAt,
  };
  if (c.evidenceNote) dto.evidenceNote = c.evidenceNote;
  const subName = nameOf(c.submittedBy);
  if (subName) dto.submittedBy = subName;
  const revName = nameOf(c.reviewedBy);
  if (revName) dto.reviewedBy = revName;
  if (c.reviewedAt) dto.reviewedAt = c.reviewedAt;
  if (c.reviewNote) dto.reviewNote = c.reviewNote;
  return dto;
}

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
  wf?: WorkflowLean,
  closeout?: CloseoutLean | null
): CorrectiveActionDto {
  const status = deriveStatus(alert.status, wf?.state, closeout?.status);
  const dto: CorrectiveActionDto = {
    id: String(alert._id),
    siteId: String(alert.siteId),
    siteName,
    title: `${titleCase(alert.ruleCode)} — ${siteName}`,
    description: `Detected via ${alert.sourceType} compliance rule.`,
    priority: SEVERITY_TO_PRIORITY[alert.severity],
    status,
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
  if (closeout) dto.closeout = toCloseoutDto(closeout);
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

    // Feature 08: batch-fetch close-out records for the scoped alert set.
    const closeoutRows = await CorrectiveCloseout.find({
      alertId: { $in: rows.map((r) => r._id) },
    })
      .populate("submittedBy", "name")
      .populate("reviewedBy", "name")
      .lean();
    const closeoutByAlert = new Map<string, CloseoutLean>();
    for (const c of closeoutRows) {
      closeoutByAlert.set(
        String((c as unknown as { alertId: unknown }).alertId),
        c as unknown as CloseoutLean
      );
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
        latestByAlert.get(String(r._id)),
        closeoutByAlert.get(String(r._id))
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

    const closeout = await CorrectiveCloseout.findOne({ alertId })
      .populate("submittedBy", "name")
      .populate("reviewedBy", "name")
      .lean();

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
        await latestWorkflow(alertId),
        closeout as unknown as CloseoutLean | null
      ),
    });
  } catch (err) {
    console.error("Get corrective action error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── Shared: mine_official must be bound to the corrective action's site ──────
// corporate_manager may act on any site; regulator/field_officer never reach
// these handlers (blocked at the route).

function canWriteCloseout(req: Request, alertSiteId: Types.ObjectId): boolean {
  const user = req.user;
  if (!user) return false;
  if (user.role === "corporate_manager") return true;
  if (user.role === "mine_official" && user.siteId) return alertSiteId.toString() === user.siteId;
  return false;
}

// ── POST /api/v1/corrective-actions/:id/close-out ──────────────────────────
// Feature 08 — the mine official (own site) or corporate manager lodges the
// close-out evidence once the corrective action is resolved. Idempotent
// create-if-none; a rejected close-out may be resubmitted (updated in place);
// a submitted or approved record rejects further submissions.

export const submitCloseout = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const alertId = String((req.params as { id?: string }).id ?? "");
    if (!/^[a-f\d]{24}$/i.test(alertId)) {
      res.status(400).json({ error: "Invalid corrective action id." });
      return;
    }

    const alert = await Alert.findById(alertId).select("siteId status").lean();
    if (!alert) {
      res.status(404).json({ error: "Corrective action not found." });
      return;
    }

    const alertSiteId = alert.siteId as Types.ObjectId;
    if (!canWriteCloseout(req, alertSiteId)) {
      res.status(403).json({ error: "Not authorized for this corrective action." });
      return;
    }

    // The loop only closes actions that were actually resolved — the close-out
    // is the final proof, not a replacement for resolution evidence.
    const wf = await latestWorkflow(alertId);
    if (alert.status !== "closed" && wf?.state !== "resolved") {
      res.status(409).json({ error: "Corrective action is not resolved yet." });
      return;
    }

    const existing = await CorrectiveCloseout.findOne({ alertId }).lean();
    if (existing?.status === "approved") {
      res.status(409).json({ error: "Close-out is already approved." });
      return;
    }
    if (existing?.status === "submitted") {
      res.status(409).json({ error: "Close-out is already submitted and awaiting review." });
      return;
    }

    const body = req.body as SubmitCloseoutInput;
    const user = req.user!;

    let record;
    if (existing?.status === "rejected") {
      // Resubmission after rejection: rewrite the evidence, reset review fields.
      record = await CorrectiveCloseout.findOneAndUpdate(
        { alertId },
        {
          $set: {
            recommendation: body.recommendation,
            effectiveness: body.effectiveness,
            evidenceNote: body.evidenceNote ?? null,
            submittedBy: new Types.ObjectId(user.id),
            submittedAt: new Date(),
            status: "submitted",
            reviewedBy: null,
            reviewedAt: null,
            reviewNote: null,
          },
        },
        { returnDocument: "after" }
      )
        .populate("submittedBy", "name")
        .populate("reviewedBy", "name")
        .lean();
    } else {
      record = await CorrectiveCloseout.create({
        alertId: new Types.ObjectId(alertId),
        siteId: alertSiteId,
        recommendation: body.recommendation,
        effectiveness: body.effectiveness,
        ...(body.evidenceNote ? { evidenceNote: body.evidenceNote } : {}),
        submittedBy: new Types.ObjectId(user.id),
      });
    }

    await logAction({
      entityType: "correctiveAction",
      entityId: new Types.ObjectId(alertId),
      action: "closeout_submitted",
      actorId: new Types.ObjectId(user.id),
      payload: {
        recommendation: body.recommendation,
        effectiveness: body.effectiveness,
        resubmitted: Boolean(existing),
      },
    });

    res.status(existing ? 200 : 201).json({
      data: toCloseoutDto((record ?? existing) as unknown as CloseoutLean),
    });
  } catch (err) {
    console.error("Submit close-out error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/corrective-actions/:id/approve | /reject ───────────────────
// Feature 08 — the corporate manager signs the close-out off (terminal "closed")
// or sends it back (submitter may resubmit). Corporate-only at the route.

async function reviewCloseout(
  req: Request,
  res: Response,
  decision: "approved" | "rejected"
): Promise<void> {
  try {
    const alertId = String((req.params as { id?: string }).id ?? "");
    if (!/^[a-f\d]{24}$/i.test(alertId)) {
      res.status(400).json({ error: "Invalid corrective action id." });
      return;
    }

    const alert = await Alert.findById(alertId).select("siteId").lean();
    if (!alert) {
      res.status(404).json({ error: "Corrective action not found." });
      return;
    }

    const closeout = await CorrectiveCloseout.findOne({ alertId }).lean();
    if (!closeout) {
      res.status(404).json({ error: "No close-out has been submitted for this corrective action." });
      return;
    }
    if (closeout.status !== "submitted") {
      res.status(409).json({ error: "Close-out has already been reviewed." });
      return;
    }

    const { reviewNote } = req.body as ReviewCloseoutInput;
    const updated = await CorrectiveCloseout.findOneAndUpdate(
      { alertId },
      {
        $set: {
          status: decision,
          reviewedBy: new Types.ObjectId(req.user!.id),
          reviewedAt: new Date(),
          ...(reviewNote ? { reviewNote } : {}),
        },
      },
      { returnDocument: "after" }
    )
      .populate("submittedBy", "name")
      .populate("reviewedBy", "name")
      .lean();

    await logAction({
      entityType: "correctiveAction",
      entityId: new Types.ObjectId(alertId),
      action: decision === "approved" ? "closeout_approved" : "closeout_rejected",
      actorId: new Types.ObjectId(req.user!.id),
      payload: { reviewNote: reviewNote ?? null },
    });

    res.json({
      data: toCloseoutDto(updated as unknown as CloseoutLean),
    });
  } catch (err) {
    console.error(`Review close-out (${decision}) error:`, err);
    res.status(500).json({ error: "Internal server error." });
  }
}

export const approveCloseout = (req: Request, res: Response): Promise<void> =>
  reviewCloseout(req, res, "approved");

export const rejectCloseout = (req: Request, res: Response): Promise<void> =>
  reviewCloseout(req, res, "rejected");