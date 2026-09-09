import { z } from "zod";

// ── Shared helpers ──────────────────────────────────────────────────────────

const objectIdRegex = /^[a-f\d]{24}$/i;

// ── List documents query validator ──────────────────────────────────────────

export const listDocumentsSchema = z.object({
  siteId: z.string().regex(objectIdRegex, "Invalid siteId").optional(),
  reviewStatus: z.enum(["pending", "confirmed", "rejected"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsSchema>;

// ── Confirm document body validator ─────────────────────────────────────────

export const confirmDocumentSchema = z.object({
  correctedFields: z.record(z.string(), z.unknown()),
  reviewStatus: z.enum(["confirmed", "rejected"]).optional().default("confirmed"),
});

export type ConfirmDocumentInput = z.infer<typeof confirmDocumentSchema>;
