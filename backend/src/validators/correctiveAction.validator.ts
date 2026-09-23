import { z } from "zod";

// Query contract for the derived corrective-actions feed.
// Client-side status/priority filters are applied to the mapped rows in the
// controller (the corrective status enum is a projection of alert + workflow,
// not a stored field), so the schema only validates primitive filters.

export const listCorrectiveActionsSchema = z.object({
  siteId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z
    .enum(["reported", "assigned", "in_progress", "resolved", "verified", "rejected", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListCorrectiveActionsQuery = z.infer<typeof listCorrectiveActionsSchema>;

// ── Feature 08: close-out writer contracts ────────────────────────────────────
// POST /corrective-actions/:id/close-out — mine official (own site) or corporate
// manager lodges the fix evidence. POST /corrective-actions/:id/approve|reject —
// corporate manager signs it off or sends it back for resubmission.

export const submitCloseoutSchema = z.object({
  recommendation: z
    .string()
    .trim()
    .min(10, "recommendation must be at least 10 characters.")
    .max(2000, "recommendation must not exceed 2000 characters."),
  effectiveness: z
    .string()
    .trim()
    .min(10, "effectiveness must be at least 10 characters.")
    .max(2000, "effectiveness must not exceed 2000 characters."),
  evidenceNote: z
    .string()
    .trim()
    .max(2000, "evidenceNote must not exceed 2000 characters.")
    .optional(),
});

export type SubmitCloseoutInput = z.infer<typeof submitCloseoutSchema>;

export const reviewCloseoutSchema = z.object({
  reviewNote: z
    .string()
    .trim()
    .max(2000, "reviewNote must not exceed 2000 characters.")
    .optional(),
});

export type ReviewCloseoutInput = z.infer<typeof reviewCloseoutSchema>;