import type { Request, Response } from "express";
import { Types } from "mongoose";
import {
  getEffectiveSlaPolicy,
  listEffectiveSlaPolicies,
  upsertSlaPolicy,
  deleteSlaPolicy,
  resetSlaPoliciesToDefaults,
} from "../services/slaPolicyService.js";
import { slaPolicySeveritySchema } from "../validators/slaPolicy.validator.js";
import { SEVERITY_ORDER } from "../services/slaPolicyService.js";
import type { SlaPolicyUpsertInput } from "../validators/slaPolicy.validator.js";
import type { AuthenticatedRequest } from "../types/index.js";

// ── Configurable Escalation Matrix admin API (feature 02, Phase A) ────────────
// SlaPolicy CRUD for oversight roles (corporate_manager + regulator — matched on
// the router). Every mutation invalidates the in-memory policy cache so the next
// engine snapshot pick-up is immediate; snapshots already stamped on alerts are
// immune by design (edge G).

// GET /api/v1/sla-policies — effective config for all severities (custom or default)

export const listSlaPolicies = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const policies = await listEffectiveSlaPolicies();
    res.json({ data: policies });
  } catch (err) {
    console.error("List SLA policies error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// GET /api/v1/sla-policies/:severity — effective config for one severity

export const getSlaPolicy = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = slaPolicySeveritySchema.safeParse(req.params.severity);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid severity.",
        details: [
          { field: "severity", message: `Must be one of: ${SEVERITY_ORDER.join(", ")}.` },
        ],
      });
      return;
    }
    const policy = await getEffectiveSlaPolicy(parsed.data);
    res.json({ data: policy });
  } catch (err) {
    console.error("Get SLA policy error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// PUT /api/v1/sla-policies/:severity — full upsert (create or replace)

export const upsertPolicy = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const parsed = slaPolicySeveritySchema.safeParse(req.params.severity);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid severity.",
        details: [
          { field: "severity", message: `Must be one of: ${SEVERITY_ORDER.join(", ")}.` },
        ],
      });
      return;
    }
    const body = req.body as SlaPolicyUpsertInput;
    // exactOptionalPropertyTypes: build the optional updatedBy via conditional
    // spread so `undefined` is never passed as an explicit value.
    const updatedBy = req.user?.id;

    const saved = await upsertSlaPolicy(parsed.data, {
      ackSla: body.ackSla,
      resolutionSla: body.resolutionSla,
      escalationChain: body.escalationChain,
      systemFallbackUserId: body.systemFallbackUserId ?? null,
      ...(updatedBy ? { updatedBy: new Types.ObjectId(updatedBy) } : {}),
    });

    const effective = await getEffectiveSlaPolicy(parsed.data);
    res.json({
      data: {
        ...effective,
        id: saved._id.toString(),
      },
    });
  } catch (err) {
    console.error("Upsert SLA policy error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// DELETE /api/v1/sla-policies/:severity — remove custom row, revert to defaults

export const removePolicy = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = slaPolicySeveritySchema.safeParse(req.params.severity);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid severity.",
        details: [
          { field: "severity", message: `Must be one of: ${SEVERITY_ORDER.join(", ")}.` },
        ],
      });
      return;
    }
    await deleteSlaPolicy(parsed.data);
    res.json({
      data: {
        severity: parsed.data,
        action: "reset-to-default",
      },
    });
  } catch (err) {
    console.error("Delete SLA policy error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// POST /api/v1/sla-policies/reset — wipe custom rows, restore all defaults

export const resetPolicies = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const restored = await resetSlaPoliciesToDefaults();
    res.json({
      data: {
        restored,
        severities: SEVERITY_ORDER,
      },
    });
  } catch (err) {
    console.error("Reset SLA policies error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};