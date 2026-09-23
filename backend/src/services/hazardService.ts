import { Types } from "mongoose";
import Hazard from "../models/Hazard.js";
import Alert from "../models/Alert.js";
import { normalizeHazardCategory } from "./recurringHazards.js";
import { logAction } from "./auditLogger.js";
import type {
  HazardControlStatus,
  HazardControlType,
  HazardRegisterSource,
  HazardRiskLevel,
  IHazard,
  IHazardEffectiveness,
} from "../types/index.js";

// ── Feature 06: Hazard Register service ──────────────────────────────────────
// Deterministic, rule-based risk + control-effectiveness engine. No ML.
//   1. Risk matrix: riskScore = likelihood × consequence (1-25) → level bands.
//   2. Hierarchy of controls: each control tier carries a weight; the STRONGEST
//      IMPLEMENTED tier determines the reduction applied to both drivers.
//   3. Effectiveness verdict from that reduction, with an empirical override:
//      the Phase D batch sweep (checkControlEffectiveness) proves a control
//      ineffective when the SAME canonical hazard recurs at the site AFTER the
//      control went live — recurrence beats hierarchy.

// ── 5×5 risk matrix (deterministic) ──────────────────────────────────────────
// score = likelihood × consequence, both clamped 1-5:
//   1-4  low · 5-9 medium · 10-15 high · 16-25 critical
export function riskLevelFor(
  likelihood: number,
  consequence: number
): { riskScore: number; riskLevel: HazardRiskLevel } {
  const l = Math.max(1, Math.min(5, Math.trunc(likelihood)));
  const c = Math.max(1, Math.min(5, Math.trunc(consequence)));
  const riskScore = l * c;
  if (riskScore >= 16) return { riskScore, riskLevel: "critical" };
  if (riskScore >= 10) return { riskScore, riskLevel: "high" };
  if (riskScore >= 5) return { riskScore, riskLevel: "medium" };
  return { riskScore, riskLevel: "low" };
}

// ── Hierarchy of controls (weight) ───────────────────────────────────────────
export const CONTROL_HIERARCHY_WEIGHT: Record<HazardControlType, number> = {
  elimination: 5,
  substitution: 4,
  engineering: 3,
  administrative: 2,
  ppe: 1,
};

// Reduction tier applied to BOTH likelihood and consequence (floored at 1):
//   tier ≥ elimination (5)  → -3   (the hazard driver is removed)
//   tier ≥ substitution (4) → -2   (a substitute replaces the hazardous agent)
//   tier ≥ engineering (3)  → -1   (guards/barriers contain it)
//   administrative / ppe    →  0   (documented, but no structural reduction)
export function reductionForTier(tier: HazardControlType): number {
  const w = CONTROL_HIERARCHY_WEIGHT[tier];
  if (w >= 5) return 3;
  if (w >= 4) return 2;
  if (w >= 3) return 1;
  return 0;
}

// One step up the hierarchy for the UI's "recommended upgrade".
export function nextControlTier(tier: HazardControlType): HazardControlType | null {
  const order: HazardControlType[] = [
    "ppe",
    "administrative",
    "engineering",
    "substitution",
    "elimination",
  ];
  const idx = order.indexOf(tier);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1]! : null;
}

// ── Deterministic effectiveness engine ───────────────────────────────────────
// Called on-demand (POST /hazards/:id/effectiveness) and by the batch sweep.
// `recurrence: true` forces the verdict to ineffective regardless of tier —
// the pattern alerting again is empirical proof the control does not work.
export function assessEffectiveness(
  hazard: {
    likelihood: number;
    consequence: number;
    controls: Array<{ controlType: HazardControlType; implemented: boolean }>;
  },
  opts: { recurrence?: boolean; assessedBy?: Types.ObjectId; note?: string } = {}
): IHazardEffectiveness {
  const implemented = hazard.controls.filter((c) => c.implemented);
  if (implemented.length === 0) {
    throw new Error("No implemented controls to assess.");
  }

  const bestWeight = Math.max(
    ...implemented.map((c) => CONTROL_HIERARCHY_WEIGHT[c.controlType])
  );
  const tier = implemented.find(
    (c) => CONTROL_HIERARCHY_WEIGHT[c.controlType] === bestWeight
  )!.controlType;
  const reduction = reductionForTier(tier);

  const residualLikelihood = Math.max(1, hazard.likelihood - reduction);
  const residualConsequence = Math.max(1, hazard.consequence - reduction);
  const { riskScore: residualRiskScore, riskLevel: residualRiskLevel } = riskLevelFor(
    residualLikelihood,
    residualConsequence
  );

  const recurrenceOverride = opts.recurrence === true;
  const status: HazardControlStatus = recurrenceOverride
    ? "ineffective"
    : reduction >= 2
      ? "effective"
      : reduction >= 1
        ? "partially_effective"
        : "ineffective";

  return {
    status,
    reduction,
    residualLikelihood,
    residualConsequence,
    residualRiskScore,
    residualRiskLevel,
    recurrenceOverride,
    assessedAt: new Date(),
    assessedBy: opts.assessedBy ?? new Types.ObjectId("000000000000000000000000"),
    ...(opts.note ? { note: opts.note } : {}),
  };
}

// ── Register a hazard (manual or raised from an open pattern alert) ──────────
// Category is derived server-side with the same canonicalizer as feature 04, so
// a register entry and a RECURRING_HAZARD alert for the same hazard share a key
// — the Phase D sweep and the risk dashboard both rely on that. When
// sourceAlertId is given, the alert must (a) exist and (b) reference the same
// site; otherwise the registration is rejected (edge case B).
export async function registerHazard(input: {
  siteId: Types.ObjectId;
  title: string;
  description: string;
  location?: { lat: number; lng: number };
  sourceAlertId?: Types.ObjectId;
  likelihood: number;
  consequence: number;
  actor: Types.ObjectId;
}): Promise<IHazard> {
  const category = normalizeHazardCategory(`${input.title} ${input.description}`);
  const { riskScore, riskLevel } = riskLevelFor(input.likelihood, input.consequence);

  let sourceType: HazardRegisterSource = "manual";
  if (input.sourceAlertId) {
    const alert = await Alert.findById(input.sourceAlertId).select("siteId ruleCode status").lean();
    if (!alert) throw new Error("Source alert not found.");
    if (alert.ruleCode !== "RECURRING_HAZARD") {
      throw new Error("sourceAlertId must reference a RECURRING_HAZARD alert.");
    }
    if (alert.siteId.toString() !== input.siteId.toString()) {
      throw new Error("Source alert belongs to a different site.");
    }
    sourceType = "alert";
  }

  const hazard = await Hazard.create({
    siteId: input.siteId,
    category,
    title: input.title,
    description: input.description,
    ...(input.location ? { location: input.location } : {}),
    sourceType,
    ...(input.sourceAlertId ? { sourceAlertId: input.sourceAlertId } : {}),
    registeredBy: input.actor,
    registeredAt: new Date(),
    likelihood: input.likelihood,
    consequence: input.consequence,
    riskScore,
    riskLevel,
    status: "open",
    controls: [],
    // effectiveness omitted — the schema defaults it to null until assessed.
  });

  await logAction({
    entityType: "hazard",
    entityId: hazard._id,
    action: "registered",
    actorId: input.actor,
    payload: {
      siteId: input.siteId.toString(),
      category,
      riskScore,
      riskLevel,
      sourceType,
    },
  });

  return hazard.toObject();
}

// ── Phase D: post-control recurrence sweep ───────────────────────────────────
// Runs inside the batch rule pass (every 15 min). For every hazard that has an
// implemented control but is not yet closed, it asks: did the SAME canonical
// hazard category produce an OPEN RECURRING_HAZARD alert at this site AFTER the
// control went live? If yes, the control is proven ineffective empirically —
// status stays "mitigating" (an upgrade is required; it must never advance to
// "controlled"), and the verdict is stored with recurrenceOverride=true.
export async function checkControlEffectiveness(): Promise<{
  scanned: number;
  reassessed: number;
}> {
  const hazards = await Hazard.find({
    status: { $in: ["open", "mitigating"] },
    "controls.implemented": true,
  }).lean();

  let scanned = 0;
  let reassessed = 0;

  for (const hazard of hazards) {
    const implementedTimes = hazard.controls
      .filter((c) => c.implemented && c.implementedAt)
      .map((c) => new Date(c.implementedAt!).getTime());
    const lastImplementedAt = Math.max(...implementedTimes, 0);
    if (!lastImplementedAt) continue;
    scanned++;

    // Recurrence = an OPEN pattern alert for the same site+category whose
    // FIRST report post-dates the control implementation. A pre-existing open
    // alert (recurrence already known before the control) must NOT override.
    const recurrence = await Alert.findOne({
      ruleCode: "RECURRING_HAZARD",
      siteId: hazard.siteId,
      category: hazard.category,
      status: { $ne: "closed" },
      firstReportedAt: { $gt: new Date(lastImplementedAt) },
    })
      .sort({ firstReportedAt: -1 })
      .select("_id ruleCode firstReportedAt lastReportedAt")
      .lean();

    if (!recurrence) continue;

    const effectiveness = assessEffectiveness(hazard, {
      recurrence: true,
      note: `Recurring pattern re-sighted ${(recurrence.firstReportedAt ?? new Date())
        .toISOString()
        .slice(0, 10)} after the control was implemented — hierarchy override to ineffective.`,
    });

    await Hazard.updateOne(
      { _id: hazard._id },
      { $set: { effectiveness, status: "mitigating" } }
    );
    reassessed++;

    await logAction({
      entityType: "hazard",
      entityId: hazard._id,
      action: "effectiveness_reassessed",
      payload: {
        reason: "post-control recurrence",
        alertId: recurrence._id.toString(),
        status: effectiveness.status,
        residualRiskScore: effectiveness.residualRiskScore,
      },
    });

    console.log(
      `[batchRules] Hazard ${hazard._id.toString()} (${hazard.category}) — control ` +
        `ineffective: ${effectiveness.status} after post-control recurrence.`
    );
  }

  return { scanned, reassessed };
}