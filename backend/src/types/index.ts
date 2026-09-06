// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types & interfaces for the AgniStrot backend.
// Import from this file everywhere — never re-declare these inline.
// ─────────────────────────────────────────────────────────────────────────────

import type { Types } from "mongoose";
import type { Request } from "express";

// ── Enums (as const unions — no TypeScript enum keyword, easier to use with Mongoose) ──

export type UserRole =
  | "field_officer"
  | "mine_official"
  | "corporate_manager"
  | "regulator";

export type InspectionType = "safety" | "environmental" | "production" | "labour";

export type ChecklistResult = "pass" | "fail" | "na";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentCategory = "safety" | "environmental" | "equipment" | "other";

export type IncidentStatus = "open" | "investigating" | "resolved";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertStatus = "open" | "acknowledged" | "escalated" | "closed";

export type WorkflowState = "assigned" | "reminded" | "escalated" | "resolved";

export type SourceType = "inspection" | "incident" | "attendance";

export type DocumentReviewStatus = "pending" | "confirmed" | "rejected";

// Rule codes — every alert is traceable to one of these
export type RuleCode =
  | "SAFETY_CHECKLIST_FAIL"      // sync: safety inspection has a failed checklist item
  | "CRITICAL_INCIDENT"          // sync: incident reported with severity = critical
  | "MISSING_MANDATORY_FIELD"    // sync: inspection checklist has an item with no result
  | "REPEAT_VIOLATION"           // batch: same rule fired 3+ times for same site in 30 days
  | "OVERDUE_INSPECTION"         // batch: required inspection type not done within mandated interval
  | "ATTENDANCE_ANOMALY";        // batch: today's attendance deviates >30% from 14-day average

// ── JWT Payload (what gets signed into the token) ────────────────────────────

export interface JwtPayload {
  id: string;        // User._id as string
  role: UserRole;
  siteId: string | null;
}

// ── Express Request augmentation (req.user set by auth middleware) ────────────

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ── Mongoose document interfaces ──────────────────────────────────────────────

export interface ISite {
  _id: Types.ObjectId;
  name: string;
  subsidiary: string;
  location: {
    lat: number;
    lng: number;
  };
  expectedWorkers: number;
  createdAt: Date;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  siteId: Types.ObjectId | null; // null for corporate_manager and regulator
  createdAt: Date;
}

export interface IChecklistItem {
  item: string;
  result: ChecklistResult;
  notes?: string;
}

export interface IInspection {
  _id: Types.ObjectId;
  clientUuid: string;       // generated on-device, used as dedup key for offline sync
  siteId: Types.ObjectId;
  inspectorId: Types.ObjectId;
  type: InspectionType;
  checklist: IChecklistItem[];
  location?: {
    lat: number;
    lng: number;
  };
  photoUrls: string[];
  capturedAt: Date;          // device-local timestamp — NOT sync time
  syncedAt: Date;
}

export interface IIncident {
  _id: Types.ObjectId;
  clientUuid: string;
  siteId: Types.ObjectId;
  reportedBy: Types.ObjectId;
  severity: IncidentSeverity;
  category: IncidentCategory;
  description: string;
  location?: {
    lat: number;
    lng: number;
  };
  photoUrls: string[];
  capturedAt: Date;
  syncedAt: Date;
  status: IncidentStatus;
}

export interface IAttendance {
  _id: Types.ObjectId;
  clientUuid: string;
  siteId: Types.ObjectId;
  workerRef: string;          // worker name/ID — no biometric in MVP
  checkType: "in" | "out";
  location?: {
    lat: number;
    lng: number;
  };
  capturedAt: Date;
}

export interface IAlert {
  _id: Types.ObjectId;
  siteId: Types.ObjectId;
  sourceType: SourceType;
  sourceId?: Types.ObjectId; // ID of the inspection/incident/attendance that triggered this (sync alerts only)
  ruleKey: string;           // universal dedup key:
                             //   sync alerts:  "sync:<sourceId>:<ruleCode>"
                             //   batch alerts: "overdue:siteId:type", "anomaly:siteId:date", "repeat:siteId:ruleCode"
  ruleCode: RuleCode;
  severity: AlertSeverity;
  status: AlertStatus;
  assignedTo: Types.ObjectId; // mine_official for that site
  createdAt: Date;
}

export interface IWorkflowState {
  _id: Types.ObjectId;
  alertId: Types.ObjectId;
  state: WorkflowState;
  deadline: Date;
  changedAt: Date;
  changedBy?: Types.ObjectId;
}

export interface IAuditLog {
  _id: Types.ObjectId;
  entityType: string;          // 'inspection' | 'incident' | 'alert' | etc.
  entityId: Types.ObjectId;
  action: string;              // 'created' | 'status_changed' | 'escalated' | etc.
  actorId?: Types.ObjectId;    // undefined for system-triggered actions
  payload?: unknown;
  prevHash: string;            // SHA-256 of previous log entry (genesis = '0'.repeat(64))
  thisHash: string;            // SHA-256 of this entry's data + prevHash
  createdAt: Date;
}

export interface IDocument {
  _id: Types.ObjectId;
  siteId: Types.ObjectId;
  sourceImageUrl: string;
  extractedFields?: Record<string, unknown>;
  confidence?: number;
  reviewStatus: DocumentReviewStatus;
  createdAt: Date;
}

// ── Utility: deadline durations per alert severity (in milliseconds) ──────────

export const ALERT_DEADLINES: Record<AlertSeverity, number> = {
  critical: 2 * 60 * 60 * 1000,        // 2 hours
  high: 24 * 60 * 60 * 1000,           // 24 hours
  medium: 3 * 24 * 60 * 60 * 1000,     // 3 days
  low: 7 * 24 * 60 * 60 * 1000,        // 7 days
};

// ── Utility: mandated inspection intervals per type (in milliseconds) ─────────

export const INSPECTION_INTERVALS: Record<InspectionType, number> = {
  production: 1 * 24 * 60 * 60 * 1000,   // every 1 day
  safety: 7 * 24 * 60 * 60 * 1000,       // every 7 days
  environmental: 14 * 24 * 60 * 60 * 1000, // every 14 days
  labour: 30 * 24 * 60 * 60 * 1000,      // every 30 days
};
