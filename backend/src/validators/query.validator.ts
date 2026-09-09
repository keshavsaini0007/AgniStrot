import { z } from "zod";
import type {
  InspectionType,
  IncidentSeverity,
  IncidentCategory,
  IncidentStatus,
  AlertSeverity,
  RuleCode,
  AlertStatus,
} from "../types/index.js";

// ── Shared helpers ──────────────────────────────────────────────────────────

const objectIdRegex = /^[a-f\d]{24}$/i;

// ── Inspections list query ──────────────────────────────────────────────────

export const listInspectionsSchema = z.object({
  siteId:  z.string().regex(objectIdRegex, "Invalid siteId").optional(),
  type:    z.enum(["safety", "environmental", "production", "labour"]).optional(),
  from:    z.coerce.date().optional(),
  to:      z.coerce.date().optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
});

export type ListInspectionsQuery = z.infer<typeof listInspectionsSchema>;

// ── Incidents list query ────────────────────────────────────────────────────

export const listIncidentsSchema = z.object({
  siteId:   z.string().regex(objectIdRegex, "Invalid siteId").optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.enum(["safety", "environmental", "equipment", "other"]).optional(),
  status:   z.enum(["open", "investigating", "resolved"]).optional(),
  from:     z.coerce.date().optional(),
  to:       z.coerce.date().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

export type ListIncidentsQuery = z.infer<typeof listIncidentsSchema>;

// ── Attendance list query ───────────────────────────────────────────────────

export const listAttendanceSchema = z.object({
  siteId:    z.string().regex(objectIdRegex, "Invalid siteId").optional(),
  checkType: z.enum(["in", "out"]).optional(),
  workerRef: z.string().min(1).max(100).optional(),
  from:      z.coerce.date().optional(),
  to:        z.coerce.date().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
});

export type ListAttendanceQuery = z.infer<typeof listAttendanceSchema>;

// ── Alerts list query ───────────────────────────────────────────────────────

export const listAlertsSchema = z.object({
  siteId:   z.string().regex(objectIdRegex, "Invalid siteId").optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  ruleCode: z.enum([
    "SAFETY_CHECKLIST_FAIL",
    "CRITICAL_INCIDENT",
    "MISSING_MANDATORY_FIELD",
    "REPEAT_VIOLATION",
    "OVERDUE_INSPECTION",
    "ATTENDANCE_ANOMALY",
  ]).optional(),
  status: z.enum(["open", "acknowledged", "escalated", "closed"]).optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(50),
});

export type ListAlertsQuery = z.infer<typeof listAlertsSchema>;

// ── Statutory report query ─────────────────────────────────────────────────

export const statutoryReportSchema = z.object({
  siteId: z.string().regex(objectIdRegex, "Invalid siteId"),
  type: z.enum(["comprehensive", "safety", "environmental", "attendance"]).default("comprehensive"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type StatutoryReportQuery = z.infer<typeof statutoryReportSchema>;

// ── Audit trail list query ───────────────────────────────────────────────────

export const listAuditSchema = z.object({
  entityType: z
    .enum(["inspection", "incident", "attendance", "alert", "report"])
    .optional(),
  entityId: z.string().regex(objectIdRegex, "Invalid entityId").optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export type ListAuditQuery = z.infer<typeof listAuditSchema>;

// ── GIS markers query ───────────────────────────────────────────────────────

export const gisMarkersSchema = z.object({
  siteId: z.string().regex(objectIdRegex, "Invalid siteId").optional(),
});

export type GisMarkersQuery = z.infer<typeof gisMarkersSchema>;

