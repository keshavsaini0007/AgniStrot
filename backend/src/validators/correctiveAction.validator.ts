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