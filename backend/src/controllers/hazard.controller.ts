import type { Response } from "express";
import { Types } from "mongoose";
import Hazard from "../models/Hazard.js";
import { logAction } from "../services/auditLogger.js";
import {
  assessEffectiveness,
  nextControlTier,
  registerHazard as registerHazardService,
  riskLevelFor,
} from "../services/hazardService.js";
import type {
  AddControlInput,
  CloseHazardInput,
  ListHazardsQuery,
  RegisterHazardInput,
  UpdateHazardInput,
} from "../validators/hazard.validator.js";
import type { AuthenticatedRequest, IHazard } from "../types/index.js";

// ── Feature 06: Hazard Register controller ───────────────────────────────────
// Read surface: mine_official (own site), corporate_manager + regulator (all
// sites). Write surface: mine_official + corporate_manager. field_officer is
// capture-only and blocked entirely; regulator is read-only oversight.
// mine_official cross-site access fail-closes to 404 (never exposes existence).

const objectIdRegex = /^[a-f\d]{24}$/i;
const IMPOSSIBLE_ID = new Types.ObjectId("000000000000000000000000");

const READ_ROLES = ["mine_official", "corporate_manager", "regulator"] as const;
const WRITE_ROLES = ["mine_official", "corporate_manager"] as const;

// Express 5 types route params as string | string[] | undefined — narrow to a
// clean string (mirrors the evidence controller's fail-closed param handling).
function paramId(req: AuthenticatedRequest, name: "id" | "controlId"): string | null {
  const raw = req.params[name];
  if (!raw || typeof raw !== "string" || !objectIdRegex.test(raw)) return null;
  return raw;
}

function scopeFilter(req: AuthenticatedRequest, siteIdOverride?: string): Record<string, unknown> {
  if (req.user.role === "mine_official") {
    return req.user.siteId
      ? { siteId: new Types.ObjectId(req.user.siteId) }
      : { siteId: IMPOSSIBLE_ID };
  }
  if (siteIdOverride) {
    return { siteId: new Types.ObjectId(siteIdOverride) };
  }
  return {};
}

// Own-site write guard — mine_official may only write hazards at their own site
// (404, mirroring the read fail-closed posture).
function ownsHazard(req: AuthenticatedRequest, hazard: { siteId: Types.ObjectId }): boolean {
  if (req.user.role !== "mine_official") return true;
  return !!req.user.siteId && hazard.siteId.toString() === req.user.siteId;
}

type HazardLean = IHazard & {
  siteName?: string;
  registeredByName?: string;
};

// A lean row has `siteId`/`registeredBy` as ObjectId — except after a populate,
// which swaps them for `{ _id, name }` objects. Resolve the id in both shapes.
function refId(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  const nested = ref as { _id?: unknown };
  if (nested._id != null) return String(nested._id);
  return String(ref);
}

function refName(ref: unknown): string | null {
  if (ref == null) return null;
  const name = (ref as { name?: unknown }).name;
  return typeof name === "string" ? name : null;
}

function hazardDto(doc: HazardLean) {
  return {
    id: String(doc._id),
    siteId: refId(doc.siteId),
    siteName: refName(doc.siteId) ?? doc.siteName ?? null,
    category: doc.category,
    title: doc.title,
    description: doc.description,
    location: doc.location ?? null,
    sourceType: doc.sourceType,
    sourceAlertId: doc.sourceAlertId ? String(doc.sourceAlertId) : null,
    sourceDocumentId: doc.sourceDocumentId ? String(doc.sourceDocumentId) : null,
    registeredBy: refId(doc.registeredBy),
    registeredByName: refName(doc.registeredBy) ?? doc.registeredByName ?? null,
    registeredAt: doc.registeredAt,
    likelihood: doc.likelihood,
    consequence: doc.consequence,
    riskScore: doc.riskScore,
    riskLevel: doc.riskLevel,
    status: doc.status,
    controls: (doc.controls ?? []).map((c) => ({
      id: String(c._id),
      description: c.description,
      controlType: c.controlType,
      ownerId: c.ownerId ? String(c.ownerId) : null,
      targetDate: c.targetDate ?? null,
      implemented: c.implemented,
      implementedAt: c.implementedAt ?? null,
      implementedById: c.implementedById ? String(c.implementedById) : null,
      createdAt: c.createdAt,
    })),
    effectiveness: doc.effectiveness
      ? {
          status: doc.effectiveness.status,
          reduction: doc.effectiveness.reduction,
          residualLikelihood: doc.effectiveness.residualLikelihood,
          residualConsequence: doc.effectiveness.residualConsequence,
          residualRiskScore: doc.effectiveness.residualRiskScore,
          residualRiskLevel: doc.effectiveness.residualRiskLevel,
          recurrenceOverride: doc.effectiveness.recurrenceOverride,
          assessedAt: doc.effectiveness.assessedAt,
          assessedBy: String(doc.effectiveness.assessedBy),
          note: doc.effectiveness.note ?? null,
        }
      : null,
    closedAt: doc.closedAt ?? null,
    closedBy: doc.closedBy ? String(doc.closedBy) : null,
    closureNote: doc.closureNote ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ── GET /api/v1/hazards/dashboard ────────────────────────────────────────────

export const hazardDashboard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListHazardsQuery;
    const scope = scopeFilter(req, q.siteId);

    const [total, open, mitigating, controlled, closed, high, critical] =
      await Promise.all([
        Hazard.countDocuments(scope),
        Hazard.countDocuments({ ...scope, status: "open" }),
        Hazard.countDocuments({ ...scope, status: "mitigating" }),
        Hazard.countDocuments({ ...scope, status: "controlled" }),
        Hazard.countDocuments({ ...scope, status: "closed" }),
        Hazard.countDocuments({ ...scope, riskLevel: "high" }),
        Hazard.countDocuments({ ...scope, riskLevel: "critical" }),
      ]);

    res.json({
      data: {
        total,
        open,
        mitigating,
        controlled,
        closed,
        high,
        critical,
      },
    });
  } catch (err) {
    console.error("Hazard dashboard error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── GET /api/v1/hazards ──────────────────────────────────────────────────────

export const listHazards = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListHazardsQuery;
    const filter = scopeFilter(req, q.siteId);
    if (q.status) filter.status = q.status;
    if (q.riskLevel) filter.riskLevel = q.riskLevel;
    if (q.category) filter.category = q.category;

    const skip = (q.page - 1) * q.limit;
    const [rows, total] = await Promise.all([
      Hazard.find(filter)
        .populate("siteId", "name")
        .populate("registeredBy", "name")
        .sort({ registeredAt: -1 })
        .skip(skip)
        .limit(q.limit)
        .lean() as Promise<unknown[]>,
      Hazard.countDocuments(filter),
    ]);

    res.json({
      data: (rows as HazardLean[]).map(hazardDto),
      total,
      page: q.page,
      limit: q.limit,
    });
  } catch (err) {
    console.error("List hazards error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── GET /api/v1/hazards/:id ──────────────────────────────────────────────────

export const getHazard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = paramId(req, "id");
    if (!id) {
      res.status(400).json({ error: "Invalid hazard ID." });
      return;
    }

    const scope = scopeFilter(req);
    const row = await Hazard.findOne({ _id: new Types.ObjectId(id), ...scope })
      .populate("siteId", "name")
      .populate("registeredBy", "name")
      .lean();
    if (!row) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    res.json({ data: hazardDto(row as HazardLean) });
  } catch (err) {
    console.error("Get hazard error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/hazards ─────────────────────────────────────────────────────
// Register a site hazard. Risk matrix + canonical category are computed
// server-side (never accepted from the client).

export const createHazard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const body = req.body as RegisterHazardInput;

    // mine_official may only register at their own site; corporate_manager may
    // register at any site via the explicit siteId in the payload.
    if (req.user.role === "mine_official") {
      if (!req.user.siteId || req.user.siteId !== body.siteId) {
        res.status(403).json({ error: "Not authorized to register hazards for this site." });
        return;
      }
    }

    const hazard = await registerHazardService({
      siteId: new Types.ObjectId(body.siteId),
      title: body.title,
      description: body.description,
      ...(body.location ? { location: body.location } : {}),
      ...(body.sourceAlertId ? { sourceAlertId: new Types.ObjectId(body.sourceAlertId) } : {}),
      likelihood: body.likelihood,
      consequence: body.consequence,
      actor: new Types.ObjectId(req.user.id),
    });

    res.status(201).json({ data: hazardDto(hazard as HazardLean) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    if (message.toLowerCase().startsWith("source")) {
      res.status(400).json({ error: message });
      return;
    }
    console.error("Create hazard error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── PUT /api/v1/hazards/:id ──────────────────────────────────────────────────
// Edit metadata + inherent drivers. Changing drivers recomputes the risk
// matrix; a re-scored hazard with an existing effectiveness verdict keeps the
// verdict but is returned to "mitigating" so it can be re-assessed.

export const updateHazard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = paramId(req, "id");
    if (!id) {
      res.status(400).json({ error: "Invalid hazard ID." });
      return;
    }
    const body = req.body as UpdateHazardInput;

    const hazard = await Hazard.findById(id);
    if (!hazard) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (!ownsHazard(req, hazard)) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (hazard.status === "closed") {
      res.status(409).json({ error: "Closed hazards are immutable." });
      return;
    }

    const nextDrivers =
      body.likelihood !== undefined || body.consequence !== undefined
        ? {
            likelihood: body.likelihood ?? hazard.likelihood,
            consequence: body.consequence ?? hazard.consequence,
          }
        : null;

    const set: Record<string, unknown> = {};
    if (body.title !== undefined) set.title = body.title;
    if (body.description !== undefined) set.description = body.description;
    if (body.location !== undefined) set.location = body.location;

    if (nextDrivers) {
      const { riskScore, riskLevel } = riskLevelFor(
        nextDrivers.likelihood,
        nextDrivers.consequence
      );
      set.likelihood = nextDrivers.likelihood;
      set.consequence = nextDrivers.consequence;
      set.riskScore = riskScore;
      set.riskLevel = riskLevel;
      // A re-scored hazard must be re-assessed — never carry a stale verdict
      // forward as if the controls still measured up.
      if (hazard.effectiveness) set.effectiveness = null;
      if (set.effectiveness === null && hazard.status === "controlled") {
        set.status = "mitigating";
      }
    }

    if (Object.keys(set).length === 0) {
      res.status(400).json({ error: "Nothing to update." });
      return;
    }

    const updated = await Hazard.findByIdAndUpdate(
      id,
      { $set: set },
      { returnDocument: "after" }
    )
      .populate("siteId", "name")
      .populate("registeredBy", "name")
      .lean();

    await logAction({
      entityType: "hazard",
      entityId: new Types.ObjectId(id),
      action: "updated",
      actorId: new Types.ObjectId(req.user.id),
      payload: { fields: Object.keys(set) },
    });

    res.json({ data: hazardDto(updated as HazardLean) });
  } catch (err) {
    console.error("Update hazard error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/hazards/:id/controls ───────────────────────────────────────
// Add a control measure (not yet implemented). Adding a control keeps the
// hazard "open" until one is implemented (→ mitigating).

export const addControl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = paramId(req, "id");
    if (!id) {
      res.status(400).json({ error: "Invalid hazard ID." });
      return;
    }
    const body = req.body as AddControlInput;

    const hazard = await Hazard.findById(id);
    if (!hazard) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (!ownsHazard(req, hazard)) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (hazard.status === "closed") {
      res.status(409).json({ error: "Cannot add a control to a closed hazard." });
      return;
    }

    const control = {
      description: body.description,
      controlType: body.controlType,
      ...(body.ownerId ? { ownerId: new Types.ObjectId(body.ownerId) } : {}),
      ...(body.targetDate ? { targetDate: body.targetDate } : {}),
      implemented: false,
      createdAt: new Date(),
    };

    const updated = await Hazard.findByIdAndUpdate(
      id,
      { $push: { controls: control } },
      { returnDocument: "after" }
    )
      .populate("siteId", "name")
      .populate("registeredBy", "name")
      .lean();

    await logAction({
      entityType: "hazard",
      entityId: new Types.ObjectId(id),
      action: "control_added",
      actorId: new Types.ObjectId(req.user.id),
      payload: { controlType: body.controlType, description: body.description },
    });

    res.status(201).json({ data: hazardDto(updated as HazardLean) });
  } catch (err) {
    console.error("Add control error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/hazards/:id/controls/:controlId/implement ──────────────────
// Mark a control implemented → hazard enters "mitigating" (effectiveness
// pending). Idempotent: re-implementing is a no-op.

export const implementControl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = paramId(req, "id");
    const controlId = paramId(req, "controlId");
    if (!id || !controlId) {
      res.status(400).json({ error: "Invalid hazard or control ID." });
      return;
    }

    const hazard = await Hazard.findById(id);
    if (!hazard) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (!ownsHazard(req, hazard)) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (hazard.status === "closed") {
      res.status(409).json({ error: "Cannot implement a control on a closed hazard." });
      return;
    }

    const control = hazard.controls.find((c) => String(c._id) === controlId);
    if (!control) {
      res.status(404).json({ error: "Control not found." });
      return;
    }

    if (!control.implemented) {
      await Hazard.updateOne(
        { _id: new Types.ObjectId(id), "controls._id": new Types.ObjectId(controlId) },
        {
          $set: {
            "controls.$.implemented": true,
            "controls.$.implementedAt": new Date(),
            "controls.$.implementedById": new Types.ObjectId(req.user.id),
            status: "mitigating",
          },
        }
      );

      await logAction({
        entityType: "hazard",
        entityId: hazard._id,
        action: "control_implemented",
        actorId: new Types.ObjectId(req.user.id),
        payload: {
          controlId,
          controlType: control.controlType,
          status: "mitigating",
        },
      });
    }

    const updated = await Hazard.findById(id)
      .populate("siteId", "name")
      .populate("registeredBy", "name")
      .lean();
    res.json({ data: hazardDto(updated as HazardLean) });
  } catch (err) {
    console.error("Implement control error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/hazards/:id/effectiveness ──────────────────────────────────
// Run the deterministic effectiveness engine over the implemented controls:
//   effective            → controlled
//   partially_effective  → stays mitigating (needs a higher-tier control)
//   ineffective          → stays mitigating (upgrade required)
// No client-supplied verdict — status, residual drivers and risk are all
// derived from the hierarchy rule + recurrence evidence.

export const assessHazardEffectiveness = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = paramId(req, "id");
    if (!id) {
      res.status(400).json({ error: "Invalid hazard ID." });
      return;
    }

    const hazard = await Hazard.findById(id);
    if (!hazard) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (!ownsHazard(req, hazard)) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (hazard.status === "closed") {
      res.status(409).json({ error: "Closed hazards cannot be re-assessed." });
      return;
    }

    const implemented = hazard.controls.filter((c) => c.implemented);
    if (implemented.length === 0) {
      res.status(400).json({
        error: "No implemented controls to assess — implement a control first.",
      });
      return;
    }

    const effectiveness = assessEffectiveness(hazard, {
      assessedBy: new Types.ObjectId(req.user.id),
      note: "Manual effectiveness assessment.",
    });

    const nextStatus =
      effectiveness.status === "effective" ? "controlled" : "mitigating";

    const updated = await Hazard.findByIdAndUpdate(
      id,
      { $set: { effectiveness, status: nextStatus } },
      { returnDocument: "after" }
    )
      .populate("siteId", "name")
      .populate("registeredBy", "name")
      .lean();

    await logAction({
      entityType: "hazard",
      entityId: new Types.ObjectId(id),
      action: "effectiveness_assessed",
      actorId: new Types.ObjectId(req.user.id),
      payload: {
        status: effectiveness.status,
        residualRiskScore: effectiveness.residualRiskScore,
        residualRiskLevel: effectiveness.residualRiskLevel,
        nextHazardStatus: nextStatus,
      },
    });

    res.json({ data: hazardDto(updated as HazardLean) });
  } catch (err) {
    console.error("Assess effectiveness error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/hazards/:id/close ───────────────────────────────────────────
// Close a hazard that reached "controlled". Lifecycle-enforced: only
// controlled hazards close (409 otherwise — a hazard with no effective controls
// must not be retired).

export const closeHazard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = paramId(req, "id");
    if (!id) {
      res.status(400).json({ error: "Invalid hazard ID." });
      return;
    }
    const body = req.body as CloseHazardInput;

    const hazard = await Hazard.findById(id);
    if (!hazard) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (!ownsHazard(req, hazard)) {
      res.status(404).json({ error: "Hazard not found." });
      return;
    }
    if (hazard.status === "closed") {
      res.status(409).json({ error: "Hazard is already closed." });
      return;
    }
    if (hazard.status !== "controlled") {
      res.status(409).json({
        error: `Only a controlled hazard can be closed (current status: ${hazard.status}).`,
      });
      return;
    }

    const updated = await Hazard.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "closed",
          closedAt: new Date(),
          closedBy: new Types.ObjectId(req.user.id),
          closureNote: body.closureNote,
        },
      },
      { returnDocument: "after" }
    )
      .populate("siteId", "name")
      .populate("registeredBy", "name")
      .lean();

    await logAction({
      entityType: "hazard",
      entityId: new Types.ObjectId(id),
      action: "closed",
      actorId: new Types.ObjectId(req.user.id),
      payload: { closureNote: body.closureNote },
    });

    res.json({ data: hazardDto(updated as HazardLean) });
  } catch (err) {
    console.error("Close hazard error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── Helper re-exported for the dashboard UI (recommended upgrade tier) ───────
export { nextControlTier };

// Exports kept for the compiler to see READ_ROLES/WRITE_ROLES as a typed source
// of truth in the route file.
export type { AddControlInput, CloseHazardInput, ListHazardsQuery, RegisterHazardInput, UpdateHazardInput };
export const _hazardRoleSets = { READ_ROLES, WRITE_ROLES } as const;