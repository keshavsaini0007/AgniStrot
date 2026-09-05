import { z } from "zod";

// ── Shared sub-schemas ───────────────────────────────────────────────────────

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Must be a valid MongoDB ObjectId.");

const uuidSchema = z.string().uuid("clientUuid must be a valid UUID v4.");

const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .optional();

// ── Inspection record schema ─────────────────────────────────────────────────

const checklistItemSchema = z.object({
  item: z.string().min(1, "Checklist item description cannot be empty."),
  result: z.enum(["pass", "fail", "na"]),
  notes: z.string().optional(),
});

export const inspectionRecordSchema = z.object({
  clientUuid: uuidSchema,
  siteId: objectIdSchema,
  type: z.enum(["safety", "environmental", "production", "labour"]),
  checklist: z
    .array(checklistItemSchema)
    .min(1, "Checklist must have at least one item."),
  location: locationSchema,
  photoUrls: z.array(z.string().url()).optional().default([]),
  capturedAt: z.coerce.date(),
});

export type InspectionRecord = z.infer<typeof inspectionRecordSchema>;

// ── Incident record schema ───────────────────────────────────────────────────

export const incidentRecordSchema = z.object({
  clientUuid: uuidSchema,
  siteId: objectIdSchema,
  severity: z.enum(["low", "medium", "high", "critical"]),
  category: z.enum(["safety", "environmental", "equipment", "other"]),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  location: locationSchema,
  photoUrls: z.array(z.string().url()).optional().default([]),
  capturedAt: z.coerce.date(),
});

export type IncidentRecord = z.infer<typeof incidentRecordSchema>;

// ── Attendance record schema ─────────────────────────────────────────────────

export const attendanceRecordSchema = z.object({
  clientUuid: uuidSchema,
  siteId: objectIdSchema,
  workerRef: z.string().min(1, "workerRef cannot be empty."),
  checkType: z.enum(["in", "out"]),
  location: locationSchema,
  capturedAt: z.coerce.date(),
});

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;

// ── Batch wrappers ───────────────────────────────────────────────────────────
// Each sync endpoint receives { records: [...] }
// Individual record validation happens inside processRecord() — not here —
// so invalid records go to rejected[] without failing the whole batch.

export const syncBatchSchema = z.object({
  records: z.array(z.unknown()).min(1, "records must be a non-empty array."),
});
