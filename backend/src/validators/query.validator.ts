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
