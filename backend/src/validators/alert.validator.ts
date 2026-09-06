import { z } from "zod";

// ── Alert lifecycle action bodies ──────────────────────────────────────────
// POST /api/v1/alerts/:id/acknowledge  — halts further auto-escalation
// POST /api/v1/alerts/:id/resolve      — closes the alert (final state)

export const acknowledgeAlertSchema = z.object({
  note: z.string().max(500, "note must not exceed 500 characters.").optional(),
});

export const resolveAlertSchema = z.object({
  resolutionNote: z
    .string()
    .max(1000, "resolutionNote must not exceed 1000 characters.")
    .optional(),
});

export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;
export type ResolveAlertInput = z.infer<typeof resolveAlertSchema>;