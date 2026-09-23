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

// Responsibility area on a user — used for department-priority assignee
// resolution (feature 02 edge H: pick the manager for the right department,
// not a random one).
export type Department = "safety" | "production" | "environmental" | "labour" | "operations";

export type InspectionType = "safety" | "environmental" | "production" | "labour";

export type ChecklistResult = "pass" | "fail" | "na";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentCategory = "safety" | "environmental" | "equipment" | "other";

export type IncidentStatus = "open" | "investigating" | "resolved";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertStatus = "open" | "acknowledged" | "escalated" | "closed";

export type WorkflowState =
  | "assigned"
  | "reminded"
  | "acknowledged" // user acknowledged the alert — halts auto-escalation
  | "escalated"
  | "resolved";

export type SourceType = "inspection" | "incident" | "attendance";

export type DocumentReviewStatus = "pending" | "confirmed" | "rejected";

// ── Feature 05: Evidence Integrity types ─────────────────────────────────────

// What kind of source record an evidence row is attached to.
export type EvidenceSourceType = "document" | "media";

// Lifecycle of an evidence record's integrity attestation:
//   UPLOAD_PENDING → UPLOAD_FAILED | unverified → verified | INTEGRITY_MISMATCH | unavailable
//   verified           recomputed bytes == contentHash (MATCH)
//   INTEGRITY_MISMATCH recomputed bytes != contentHash (edge case B)
//   unavailable        verify attempted but source bytes could not be read
//                      (cloud down / 404 — edge case G)
//   unverified         hash never recorded (hash error — edge case H) or verify
//                      never run / legacy no baseline — NEVER mismatch
//   UPLOAD_PENDING / UPLOAD_FAILED  upload lifecycle cloud-outage states
//                      (edge case G) — no stored file, no false success
export type IntegrityStatus =
  | "UPLOAD_PENDING"
  | "UPLOAD_FAILED"
  | "unverified"
  | "verified"
  | "INTEGRITY_MISMATCH"
  | "unavailable";

export interface IEvidence {
  _id: Types.ObjectId;
  sourceType: EvidenceSourceType;
  sourceRecordId?: Types.ObjectId; // document _id for sourceType "document" (media has no persisted source record)
  siteId: Types.ObjectId;
  fileUrl: string;                 // display URL (Cloudinary secure_url or local-mode placeholder) — NOT the integrity identity (edge C)
  verificationSource: string;      // where the stored bytes live: untransformed Cloudinary original URL ("url") or absolute local disk path ("file")
  verificationSourceKind: "url" | "file";
  contentHash?: string;            // SHA-256 of the STORED evidence bytes (edge F). Absent = hashing failed → stays unverified (edge H).
  fileName?: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
  integrityStatus: IntegrityStatus;
  verificationNote?: string;       // why a row is unverified / unavailable / mismatch
  checkCount: number;              // live verification attempts
  lastVerifiedAt?: Date;
  createdAt: Date;
}

// ── Feature 04: Recurring Problem Detection types ────────────────────────────
// An alert's pattern classification (edge case E) — the same category can be:
//   localized       one zone cluster at a site
//   site-wide       ≥2 zones at the same site
//   category-wide   same category qualifying at ≥2 sites
export type RecurringHazardScope = "localized" | "site-wide" | "category-wide";

// One record (failed inspection item or incident) that contributed evidence to
// a RECURRING_HAZARD alert. Snapshot of record identity at detection time —
// never used as a foreign-key guarantee, only for traceability.
export interface IAlertEvidence {
  sourceType: SourceType;
  sourceId: Types.ObjectId;
  reporterId?: Types.ObjectId; // inspectorId (inspection) or reportedBy (incident)
  capturedAt: Date;
}

// ── Event-Driven Architecture types ──────────────────────────────────────────

// Domain events published to the durable outbox. Type = SCREAMING_SNAKE.
// Only the events we currently emit are dispatched by consumers; the rest are
// reserved for future flows (corrective actions, compliance, auth, ...).
export type EventType =
  | "INCIDENT_CREATED"
  | "INCIDENT_CRITICAL"
  | "INSPECTION_CREATED"
  | "INSPECTION_FAILED"
  | "ATTENDANCE_SYNCED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_VERIFIED"
  | "ALERT_CREATED"
  | "ALERT_REMINDED"
  | "ALERT_ESCALATED"
  | "CORRECTIVE_ACTION_CREATED"
  | "CORRECTIVE_ACTION_OVERDUE"
  | "CORRECTIVE_ACTION_VERIFIED"
  | "COMPLIANCE_OVERDUE"
  | "USER_LOGIN";

// Which kind of aggregate an event is attached to.
export type AggregateType =
  | "inspection"
  | "incident"
  | "attendance"
  | "document"
  | "alert";

// Lifecycle of an outbox event:
//   pending → processing → completed
//   pending → processing → failed → (retry → pending | dead → FailedJob/DLQ)
export type OutboxStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "dead";

// Rule codes — every alert is traceable to one of these
export type RuleCode =
  | "SAFETY_CHECKLIST_FAIL"      // sync: safety inspection has a failed checklist item
  | "CRITICAL_INCIDENT"          // sync: incident reported with severity = critical
  | "MISSING_MANDATORY_FIELD"    // sync: inspection checklist has an item with no result
  | "REPEAT_VIOLATION"           // batch: same rule fired 3+ times for same site in 30 days
  | "OVERDUE_INSPECTION"         // batch: required inspection type not done within mandated interval
  | "ATTENDANCE_ANOMALY"         // batch: today's attendance deviates >30% from 14-day average
  | "RECURRING_HAZARD";          // batch: same canonical hazard (category) recurs in a zone;
                                 //   ≥3 reports from ≥2 unique reporters across ≥2 dates (feature 04)

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

// Alias for controllers that use AuthRequest
export type AuthRequest = AuthenticatedRequest;

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
  isActive?: boolean;            // false = deactivated — never assigned or escalated to (feature 02 edge B)
  department?: Department;       // responsibility area — department-priority assignment (feature 02 edge H)
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
  syncedAt: Date;
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
  assignedTo: Types.ObjectId; // active user in the current rung's role for that site
  // ── Configurable SLA / Escalation Matrix (feature 02) ────────────────────
  slaSnapshot: ISlaSnapshot;       // policy stamped at creation (edge G) — the engine reads THIS, never the live policy
  ackDeadline: Date | null;        // acknowledge-by time = createdAt + ackSla
  resolutionDeadline: Date | null; // resolve-by time = createdAt + resolutionSla
  currentLevel: number;            // 1-based rung the alert is on (1 = initial assignee)
  escalationCount: number;         // number of re-assignments up the ladder (0 = never escalated)
  lastEscalatedAt: Date | null;    // most recent escalation timestamp
  acknowledgedAt: Date | null;     // when someone acknowledged (for ack-SLA compliance)
  department?: Department;         // responsibility area captured at creation (edge H)
  // ── Feature 04: Recurring Problem Detection (RECURRING_HAZARD only) ────────
  category?: string;               // canonical hazard category (normalized key, edge case B)
  scope?: RecurringHazardScope;    // localized | site-wide | category-wide (edge case E)
  evidence?: IAlertEvidence[];     // source records proving the pattern (capped, newest first)
  reportCount?: number;            // total reports in the current detection window
  uniqueReporters?: number;        // distinct inspector/reporter ids (edge case D)
  reinforcedCount?: number;        // times a still-open alert absorbed new reports (REPEAT vs UNRESOLVED, edge A)
  zoneCount?: number;              // distinct radius clusters behind this pattern (edge case C/E)
  sitesAffected?: number;          // distinct sites with the same category (edge case E)
  firstReportedAt?: Date;          // earliest capturedAt in the window
  lastReportedAt?: Date;           // latest capturedAt in the window
  createdAt: Date;
  resolvedAt?: Date;          // timestamp when alert was closed
}

export interface IWorkflowState {
  _id: Types.ObjectId;
  alertId: Types.ObjectId;
  state: WorkflowState;
  level: number;    // the alert's currentLevel when this transition was written (feature 02)
  deadline: Date;
  changedAt: Date;
  changedBy?: Types.ObjectId;
  note?: string | null; // free-text captured alongside the transition (e.g. resolutionNote on resolve)
}

// ── Configurable SLA / Escalation Matrix (feature 02) ─────────────────────────
// Admin-managed per-severity deadline + escalation ladder stored in MongoDB
// instead of the hardcoded ALERT_DEADLINES map below.

// One rung of the escalation ladder. waitMinutes is the ABSOLUTE offset (minutes)
// from alert creation at which this level's response is due. Levels are
// validated to be contiguous, non-repeating (a repeat would be a cycle — edge D)
// and strictly increasing in waitMinutes.
export interface IEscalationLevel {
  level: number;       // 1-based, contiguous from 1
  role: UserRole;      // target role to escalate TO at this level (never field_officer)
  waitMinutes: number; // absolute minutes from alert creation; strictly increasing
}

// SLA policy snapshot captured on an alert at creation time (edge G): the engine
// reads the snapshot, never the live policy, so changing the policy later does
// not retroactively move deadlines of already-created alerts.
export interface ISlaSnapshot {
  ackSla: number;                        // minutes within which the alert must be acknowledged
  resolutionSla: number;                 // minutes within which the alert must be resolved
  escalationChain: IEscalationLevel[];   // ordered ladder, captured at creation
}

export interface ISlaPolicy {
  _id: Types.ObjectId;
  severity: AlertSeverity;                     // unique — one policy per severity
  ackSla: number;                              // minutes to acknowledge (breach if exceeded)
  resolutionSla: number;                       // minutes to resolve (final deadline)
  escalationChain: IEscalationLevel[];         // configured ladder (validated: no cycles, contiguous, increasing)
  systemFallbackUserId: Types.ObjectId | null; // last-resort assignee when no chain role has an active user (edge C)
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLog {
  _id: Types.ObjectId;
  entityType: string;          // 'inspection' | 'incident' | 'alert' | etc.
  entityId: Types.ObjectId;
  action: string;              // 'created' | 'status_changed' | 'escalated' | etc.
  dedupeKey?: string | null;   // unique idempotency key (usually the outbox eventKey)
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

export interface IOutboxEvent {
  _id: Types.ObjectId;
  eventKey: string;          // unique dedup key: "<aggregateType>:<aggregateId>:<type>"
  type: EventType;
  aggregateType: AggregateType;
  aggregateId: Types.ObjectId;
  siteId?: Types.ObjectId;
  actorId?: Types.ObjectId | null;
  sequenceNumber: number;    // per-aggregate ordering (monotonic, assigned at emit)
  payload?: unknown;
  status: OutboxStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string | null;
  nextAttemptAt: Date;       // when the worker may retry this event
  processingStartedAt?: Date | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFailedJob {
  _id: Types.ObjectId;
  jobType: string;           // the event type that exhausted its retries
  payload?: unknown;
  error: string;
  attempts: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  status: "failed" | "reprocessed" | "discarded";
  createdAt: Date;
}

// ── OCR Service Types ──────────────────────────────────────────────────────

export interface OcrResult {
  rawText: string;
  confidence: number;
  extractedFields: Record<string, unknown>;
}

// ── GIS Types ──────────────────────────────────────────────────────────────

export interface MapMarker {
  id: string;
  category: "site" | "inspection" | "incident";
  lat: number;
  lng: number;
  siteId: string;
  siteName: string;
  title: string;
  severity?: "low" | "medium" | "high" | "critical";
  status?: string;
  timestamp?: Date;
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
