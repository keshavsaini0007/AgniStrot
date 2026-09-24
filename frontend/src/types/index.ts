// ============================================================================
// AgniStrot — Frontend contract types
// ----------------------------------------------------------------------------
// These types mirror `backend/src/types/index.ts` so that ANY backend endpoint
// maps cleanly into the frontend. Ids are serialized as strings and dates as
// ISO-8601 strings. API-facing types (Sections 1–5) come straight from the
// backend; demo-only view models (Section 6) power the mock/demo screens.
// ============================================================================

// ─── 1. Shared enums (canonical — mirror backend) ─────────────────────────

export type UserRole =
  | 'field_officer'
  | 'mine_official'
  | 'corporate_manager'
  | 'regulator';

export type InspectionType = 'safety' | 'environmental' | 'production' | 'labour';

export type ChecklistResult = 'pass' | 'fail' | 'na';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentCategory = 'safety' | 'environmental' | 'equipment' | 'other';

export type IncidentStatus = 'open' | 'investigating' | 'resolved';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'open' | 'acknowledged' | 'escalated' | 'closed';

export type WorkflowState =
  | 'assigned'
  | 'reminded'
  | 'acknowledged'
  | 'escalated'
  | 'resolved';

export type SourceType = 'inspection' | 'incident' | 'attendance';

export type DocumentReviewStatus = 'pending' | 'confirmed' | 'rejected';

export type RuleCode =
  | 'SAFETY_CHECKLIST_FAIL'
  | 'CRITICAL_INCIDENT'
  | 'MISSING_MANDATORY_FIELD'
  | 'REPEAT_VIOLATION'
  | 'OVERDUE_INSPECTION'
  | 'ATTENDANCE_ANOMALY'
  | 'RECURRING_HAZARD';

export const ALERT_DEADLINE_MS: Record<AlertSeverity, number> = {
  critical: 2 * 60 * 60 * 1000, // 2 hours
  high: 24 * 60 * 60 * 1000, // 24 hours
  medium: 3 * 24 * 60 * 60 * 1000, // 3 days
  low: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── 2. Entity contracts (DTO views of backend documents) ──────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** backend `Site` — "Mine" for display purposes. */
export interface Site {
  _id: string;
  id: string;
  name: string;
  subsidiary: string;
  location: GeoPoint;
  expectedWorkers: number;
  createdAt?: string;
}

/** A mine/site reference used across dashboards (site id + human title). */
export interface SiteRef {
  siteId: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** null for corporate_manager and regulator */
  siteId: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

/** Admin user-management patch (feature 07). Email is immutable — never sent. */
export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  siteId?: string | null;
  status?: 'active' | 'inactive';
}

/** Optional GET /users filters (feature 07) — empty values are omitted by the client. */
export interface UserListParams {
  role?: UserRole;
  status?: 'active' | 'inactive';
}

export interface ChecklistItem {
  item: string;
  result: ChecklistResult;
  notes?: string;
}

/** backend `Inspection` — an offline-first field capture (checklist based). */
export interface Inspection {
  id: string;
  clientUuid?: string;
  siteId: string;
  inspectorId: string;
  type: InspectionType;
  checklist: ChecklistItem[];
  location?: GeoPoint;
  photoUrls: string[];
  capturedAt: string; // device-local time, NOT sync time
  syncedAt?: string;
  /** derived for display — number of failed checklist items */
  failedCount?: number;
}

/** backend `Incident` — severity-tagged field report with evidence. */
export interface Incident {
  id: string;
  clientUuid?: string;
  siteId: string;
  siteName?: string;
  reportedBy: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  description: string;
  location?: GeoPoint;
  photoUrls: string[];
  capturedAt: string;
  syncedAt?: string;
  status: IncidentStatus;
}

/** backend `Attendance` — geo-stamped check in / out (no biometrics in MVP). */
export interface Attendance {
  id: string;
  clientUuid?: string;
  siteId: string;
  workerRef: string;
  checkType: 'in' | 'out';
  location?: GeoPoint;
  capturedAt: string;
  syncedAt?: string;
}

/** backend `Alert` — every detection result, routed to an owner with a deadline. */
export interface Alert {
  id: string;
  siteId: string;
  sourceType: SourceType;
  sourceId?: string;
  ruleKey: string;
  ruleCode: RuleCode;
  severity: AlertSeverity;
  status: AlertStatus;
  assignedTo: string;
  createdAt: string;
  resolvedAt?: string;
  workflow?: WorkflowLog[];
  // ── Feature 04: Recurring Problem Detection (RECURRING_HAZARD only) ────────
  category?: string;
  scope?: 'localized' | 'site-wide' | 'category-wide';
  reportCount?: number;
  uniqueReporters?: number;
  reinforcedCount?: number;
  zoneCount?: number;
  sitesAffected?: number;
  firstReportedAt?: string;
  lastReportedAt?: string;
  evidence?: AlertEvidence[];
}

/** One source record behind a RECURRING_HAZARD alert (identity snapshot). */
export interface AlertEvidence {
  sourceType: SourceType;
  sourceId: string;
  reporterId?: string;
  capturedAt: string;
}

/** backend `WorkflowState` — audit of the alert's escalation lifecycle. */
export interface WorkflowLog {
  id: string;
  alertId: string;
  state: WorkflowState;
  deadline: string;
  changedAt: string;
  changedBy?: string;
}

/** backend `AuditLog` — append-only, hash-chained trail. */
export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  payload?: Record<string, unknown>;
  prevHash: string;
  thisHash: string;
  createdAt: string;
}

/** backend `Document` — OCR-ingested paper form waiting for human review. */
export interface OcrDocument {
  id: string;
  siteId: string;
  sourceImageUrl: string;
  extractedFields?: Record<string, unknown>;
  confidence?: number;
  reviewStatus: DocumentReviewStatus;
  createdAt: string;
}

// ─── Feature 05: Evidence integrity (SHA-256 at ingest + verification) ──────

export type EvidenceIntegrityStatus =
  | 'UPLOAD_PENDING'
  | 'UPLOAD_FAILED'
  | 'unverified'
  | 'verified'
  | 'INTEGRITY_MISMATCH'
  | 'unavailable';

/** backend `Evidence` row — one attestation per uploaded file. */
export interface Evidence {
  id: string;
  sourceType: 'document' | 'media';
  sourceRecordId: string | null;
  siteId: string;
  fileUrl: string;
  fileName: string | null;
  contentHash: string | null;
  uploadedByName: string;
  uploadedAt: string;
  integrityStatus: EvidenceIntegrityStatus;
  verificationNote: string | null;
  checkCount: number;
  lastVerifiedAt: string | null;
  createdAt: string;
  /** Same binary content seen on another row — informational, never a fraud flag. */
  duplicateCount: number;
}

/** `GET /evidence/dashboard` payload. */
export interface EvidenceDashboard {
  total: number;
  checked: number;
  verified: number;
  mismatched: number;
  unverified: number;
  unavailable: number;
  uploadFailed: number;
  uploadPending: number;
  noBaseline: number;
}

/** `POST /evidence/:id/verify` result. */
export interface EvidenceVerifyResult {
  id: string;
  integrityStatus: EvidenceIntegrityStatus;
  checkCount: number;
  lastVerifiedAt: string;
  verificationNote: string | null;
}

/** `POST /evidence/verify-all` summary. */
export interface VerifyAllSummary {
  checked: number;
  verified: number;
  mismatched: number;
  unavailable: number;
  unverified: number;
  uploadFailed: number;
  failed: number;
}

// ─── Feature 06: Hazard Register & Control Effectiveness ────────────────────

export type HazardStatus = 'open' | 'mitigating' | 'controlled' | 'closed';

export type HazardRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type HazardControlType =
  | 'elimination'
  | 'substitution'
  | 'engineering'
  | 'administrative'
  | 'ppe';

export type HazardControlStatus = 'effective' | 'partially_effective' | 'ineffective';

export type HazardSourceType = 'manual' | 'alert' | 'ocr';

/** One hierarchy-of-controls measure attached to a hazard. */
export interface HazardControl {
  id: string;
  description: string;
  controlType: HazardControlType;
  ownerId: string | null;
  targetDate: string | null;
  implemented: boolean;
  implementedAt: string | null;
  implementedById: string | null;
  createdAt: string;
}

/** Server-derived effectiveness verdict (never client-supplied). */
export interface HazardEffectiveness {
  status: HazardControlStatus;
  reduction: number;
  residualLikelihood: number;
  residualConsequence: number;
  residualRiskScore: number;
  residualRiskLevel: HazardRiskLevel;
  /** Post-control pattern re-sighting forces ineffective regardless of tier. */
  recurrenceOverride: boolean;
  assessedAt: string;
  assessedBy: string;
  note: string | null;
}

/** backend `Hazard` row — lifecycle open → mitigating → controlled → closed. */
export interface Hazard {
  id: string;
  siteId: string;
  siteName: string | null;
  category: string;
  title: string;
  description: string;
  location: { lat: number; lng: number } | null;
  sourceType: HazardSourceType;
  sourceAlertId: string | null;
  /** Scanned Document the entry was auto-captured from (sourceType 'ocr'). */
  sourceDocumentId: string | null;
  registeredBy: string;
  registeredByName: string | null;
  registeredAt: string;
  likelihood: number;
  consequence: number;
  riskScore: number;
  riskLevel: HazardRiskLevel;
  status: HazardStatus;
  controls: HazardControl[];
  effectiveness: HazardEffectiveness | null;
  closedAt: string | null;
  closedBy: string | null;
  closureNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /hazards/dashboard` counts. */
export interface HazardDashboard {
  total: number;
  open: number;
  mitigating: number;
  controlled: number;
  closed: number;
  high: number;
  critical: number;
}

/** `POST /hazards` — drivers only; risk is recomputed server-side. */
export interface RegisterHazardInput {
  siteId: string;
  title: string;
  description: string;
  likelihood: number;
  consequence: number;
  sourceAlertId?: string;
  location?: { lat: number; lng: number };
}

/** `POST /hazards/:id/controls`. */
export interface AddHazardControlInput {
  description: string;
  controlType: HazardControlType;
}

/** `PATCH /hazards/:id` — drivers + description, risk recomputed. */
export type UpdateHazardInput = Partial<{
  title: string;
  description: string;
  likelihood: number;
  consequence: number;
  location: { lat: number; lng: number };
}>;

/** `GET /hazards` query filters (super-set of FilterParams). */
export type HazardListParams = FilterParams & {
  riskLevel?: HazardRiskLevel;
  category?: string;
};

/** backend `gis/markers` payload. */
export interface MapMarker {
  id: string;
  category: 'site' | 'inspection' | 'incident';
  lat: number;
  lng: number;
  siteId: string;
  siteName: string;
  title: string;
  severity?: IncidentSeverity;
  status?: string;
  timestamp?: string;
}

/** Signed contributor to a site's risk score (positive ⇒ adds risk, negative ⇒ relief). */
export interface RiskContributor {
  key: string;
  label: string;
  /** Score points this factor contributes (negative = reduces risk). */
  points: number;
  /** Count of contributing items (alerts, failed inspections, open hazards…). */
  count: number;
  kind: 'risk' | 'relief';
}

/** backend `gis/risk-layers` payload — one aggregate per site. */
export interface RiskLayer {
  siteId: string;
  siteName: string;
  subsidiary: string;
  location: { lat: number; lng: number };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  breakdown: {
    alertScore: number;
    inspectionScore: number;
    incidentScore: number;
    resolutionBonus: number;
    recurringHazardBonus: number;
    openHazardBonus: number;
  };
  metrics: {
    totalAlerts: number;
    unresolvedAlerts: number;
    failedInspections: number;
    criticalIncidents: number;
    resolutionRate: number;
    recurringHazards: number;
    openHazards: number;
  };
  topContributors: RiskContributor[];
}

/** Query for `GET /reports/statutory`. */
export interface StatutoryReportQuery {
  siteId: string;
  type: InspectionType;
  from: string;
  to: string;
}

/** Query for `GET /exports/attendance.csv` (site + date-window filters). */
export interface AttendanceExportQuery {
  siteId?: string;
  from?: string;
  to?: string;
}

/** Risk intelligence payload from `GET /ai/*` (explainable, rule-based). */
export interface RiskAssessment {
  siteId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{ label: string; score: number; severity: 'low' | 'medium' | 'high' }>;
  explanation: string;
  recommendations: string[];
  generatedAt: string;
  /** Feature 04 — open recurring-hazard patterns in the window (risk chip). */
  recurringHazards?: number;
}

/** Normalized 30-day trend point for the risk-intelligence chart. */
export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

/** Feature 03 — risk trend forecasting (rule-based + statistical). */
export type TrendDirection =
  | 'increasing'
  | 'decreasing'
  | 'stable'
  | 'volatile'
  | 'new-activity'
  | 'insufficient-data';

export interface TrendCategory {
  direction: TrendDirection;
  /** `null` when the previous period had zero activity (zero baseline → new activity). */
  percentChange: number | null;
  newActivity: boolean;
}

export interface TrendClassification {
  method: 'rule-based';
  label: string;
  overall: TrendDirection;
  confidence: 'low' | 'medium' | 'high';
  perCategory: {
    inspections: TrendCategory;
    incidents: TrendCategory;
    alerts: TrendCategory;
  };
}

export interface TrendContributor {
  key: string;
  label: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: 'high' | 'medium' | 'low';
  count: number;
  detail: string;
}

export interface ForecastProjection {
  method: 'linear-regression' | 'moving-average' | 'insufficient-data';
  baselineScore: number;
  projectedScore: number | null;
  projectedBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  bandTrend: TrendDirection;
  next30d: {
    inspections: number | null;
    incidents: number | null;
    alerts: number | null;
  };
  confidence: 'low' | 'medium' | 'high';
  label: string;
}

export interface TrendSeries {
  labels: string[];
  inspections: number[];
  incidents: number[];
  alerts: number[];
  score: (number | null)[];
}

/** Normalized per-site trend/forecast payload (`GET /ai/trends/:siteId`). */
export interface SiteTrend {
  siteId: string;
  period: string;
  inspections: { total: number; passed: number; failed: number; percentChange: number };
  incidents: { total: number; critical: number; resolved: number; percentChange: number };
  alerts: { total: number; open: number; avgResolutionTimeHours: number; percentChange: number };
  classification: TrendClassification;
  contributors: TrendContributor[];
  forecast: ForecastProjection;
  series: TrendSeries;
}

/** Global risk scanner summary across all sites (`GET /ai/summary`). */
export interface AiSummary {
  totalSites: number;
  highRiskSites: number;
  generatedAt: string;
}

/** Aggregated, role-aware dashboard feed (`GET /dashboard/summary`). */
export interface DashboardSummary {
  role?: string;
  scopedSiteId?: string | null;
  code?: string;
  message?: string;
  stats?: {
    inspections7d?: number;
    incidents7d?: number;
    attendance7d?: number;
    alerts7d?: number;
    complianceRate?: number;
    openIncidents?: number;
    overdueInspections?: number;
    upcomingDeadlines?: number;
  };
  recentIncidents?: Incident[];
  recentAlerts?: Alert[];
  sites?: Array<SiteRef & { openAlerts: number; riskScore?: number }>;
  trend7Day?: Array<{ date: string; alerts: number }>;
}

// ─── 3. API envelopes & pagination ─────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
}

/** Normalized envelope returned by every repository (mock + live). */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Normalized single-resource envelope returned by repositories. */
export interface ItemResponse<T> {
  success: boolean;
  data: T;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** What `POST /auth/login` returns. */
export interface AuthResult {
  token: string;
  user: User;
}

// ─── 4. Query parameters ────────────────────────────────────────────────────

export interface FilterParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  siteId?: string;
  type?: string;
  status?: string;
  severity?: string;
  from?: string;
  to?: string;
  [key: string]: any;
}

// ─── 5. Sync payloads (mirror `syncBatchSchema`) ────────────────────────────

export interface InspectionSyncPayload {
  clientUuid: string;
  siteId: string;
  inspectorId: string;
  type: InspectionType;
  checklist: ChecklistItem[];
  location?: GeoPoint;
  photoUrls: string[];
  capturedAt: string;
}

export interface IncidentSyncPayload {
  clientUuid: string;
  siteId: string;
  reportedBy: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  description: string;
  location?: GeoPoint;
  photoUrls: string[];
  capturedAt: string;
  status: IncidentStatus;
}

export interface AttendanceSyncPayload {
  clientUuid: string;
  siteId: string;
  workerRef: string;
  checkType: 'in' | 'out';
  location?: GeoPoint;
  capturedAt: string;
}

// ─── 6. Demo-only view models (mock screens) ────────────────────────────────

/** Demo screen (MinesPage): derived + pitch-flavoured mine card. */
export interface Mine {
  id: string;
  name: string;
  code: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  subsidiary?: string;
  status: 'active' | 'inactive' | 'maintenance';
  complianceRate: number;
  riskScore: number;
  openObservations: number;
  overdueActions: number;
  lastInspectionAt?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched fields supplied by the real /sites + AI-risk adapter
  address?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  inspections?: number;
  incidents?: number;
  openAlerts?: number;
  compliance?: number;
  lastInspection?: string;
  image?: string;
}

/** Demo/legacy field report ("observation") used by the mock dashboard feed. */
export interface Observation {
  id: string;
  mineId: string;
  inspectionId?: string;
  reportedBy: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  evidence: string[];
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedDepartment?: string;
  createdAt: string;
  updatedAt: string;
}

/** Demo screen (CorrectiveActionsPage): lifecycle with reject/reopen. */
export interface CorrectiveAction {
  id: string;
  observationId: string;
  mineId: string;
  assignedTo?: string;
  department?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  status: 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'verified' | 'rejected' | 'closed';
  resolutionNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  closeout?: CorrectiveCloseout;
  createdAt: string;
  updatedAt: string;
}

/** Feature 08 — persistent close-out record (1:1 with the corrective action). */
export interface CorrectiveCloseout {
  status: 'submitted' | 'approved' | 'rejected';
  recommendation: string;
  effectiveness: string;
  evidenceNote?: string;
  submittedBy?: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

/** Demo screen (CompliancePage): requirement register. */
export interface ComplianceRequirement {
  id: string;
  mineId: string;
  requirement: string;
  category: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'overdue';
  dueDate: string;
  responsibleDepartment: string;
  documents: string[];
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Legacy demo notification inbox (replaced by the live Alert feed). */
export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  entityType: string;
  entityId: string;
  read: boolean;
  createdAt: string;
}

/** Dashboard aggregate used by the (existing) app dashboard layout. */
export interface DashboardData {
  kpis: {
    totalMines: number;
    complianceRate: number;
    highRiskMines: number;
    pendingInspections: number;
    overdueActions: number;
  };
  complianceTrend: Array<{ date: string; value: number }>;
  riskIntelligence: RiskAssessment[];
  recentObservations: Observation[];
  alerts: Notification[];
}