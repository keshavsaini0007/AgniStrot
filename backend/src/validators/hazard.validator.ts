import { z } from "zod";

// ── Feature 06: Hazard Register validators ───────────────────────────────────
// The risk engine is server-side and deterministic: the client supplies only
// the DRIVERS (likelihood 1-5, consequence 1-5); riskScore/riskLevel are always
// recomputed and never accepted from the request body (stripped by zod's
// default unknown-field pruning).

const objectIdRegex = /^[a-f\d]{24}$/i;

const latLngShape = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .optional();

// ── Register a hazard ────────────────────────────────────────────────────────

export const registerHazardSchema = z.object({
  siteId: z.string().regex(objectIdRegex, "Invalid siteId"),
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200, "Title too long."),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters.")
    .max(2000, "Description too long."),
  location: latLngShape,
  // Link to the OPEN RECURRING_HAZARD alert this register entry was raised from
  // (sourceType becomes "alert" when present — the alert's site must match).
  sourceAlertId: z.string().regex(objectIdRegex, "Invalid sourceAlertId").optional(),
  // Inherent-risk drivers — the 5×5 matrix runs server-side.
  likelihood: z.coerce.number().int().min(1, "likelihood must be 1-5.").max(5, "likelihood must be 1-5."),
  consequence: z.coerce.number().int().min(1, "consequence must be 1-5.").max(5, "consequence must be 1-5."),
});

export type RegisterHazardInput = z.infer<typeof registerHazardSchema>;

// ── Update hazard metadata (drivers + description; risk recomputed) ─────────

export const updateHazardSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200, "Title too long.").optional(),
    description: z
      .string()
      .trim()
      .min(5, "Description must be at least 5 characters.")
      .max(2000, "Description too long.")
      .optional(),
    location: latLngShape,
    likelihood: z.coerce.number().int().min(1).max(5).optional(),
    consequence: z.coerce.number().int().min(1).max(5).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided.",
  });

export type UpdateHazardInput = z.infer<typeof updateHazardSchema>;

// ── Add a control measure ────────────────────────────────────────────────────

export const addControlSchema = z.object({
  description: z
    .string()
    .trim()
    .min(3, "Control description must be at least 3 characters.")
    .max(500, "Control description too long."),
  controlType: z.enum(["elimination", "substitution", "engineering", "administrative", "ppe"]),
  ownerId: z.string().regex(objectIdRegex, "Invalid ownerId").optional(),
  targetDate: z.coerce.date().optional(),
});

export type AddControlInput = z.infer<typeof addControlSchema>;

// ── Close a hazard ───────────────────────────────────────────────────────────

export const closeHazardSchema = z.object({
  closureNote: z.string().trim().min(3, "Closure note must be at least 3 characters.").max(1000, "Closure note too long."),
});

export type CloseHazardInput = z.infer<typeof closeHazardSchema>;

// ── List query ───────────────────────────────────────────────────────────────

export const listHazardsSchema = z.object({
  siteId: z.string().regex(objectIdRegex, "Invalid siteId").optional(),
  status: z.enum(["open", "mitigating", "controlled", "closed"]).optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListHazardsQuery = z.infer<typeof listHazardsSchema>;