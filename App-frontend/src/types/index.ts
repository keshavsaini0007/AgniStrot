export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  mineId?: string;
  /**
   * Real-backend site binding (feature 07 parity). Legacy mock rows only have
   * mineId; the live directory returns siteId (ObjectId string) or null.
   */
  siteId?: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// Backend vocabulary first (auth/login returns these), legacy demo roles kept
// for the mock screens that still resolve against the mock database.
export type UserRole =
  | 'mine_official'
  | 'corporate_manager'
  | 'regulator'
  | 'field_officer'
  | 'system_admin'
  | 'mine_officer'
  | 'field_inspector'
  | 'department_officer'
  | 'contractor'
  | 'corporate_management'
  | 'regulatory_authority'
  | 'auditor';

/** Admin user-management patch (feature 07) — email is immutable, never sent. */
export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  siteId?: string | null;
  status?: 'active' | 'inactive';
}

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
}

export interface Inspection {
  id: string;
  mineId: string;
  inspectorId: string;
  type: 'safety' | 'environmental' | 'operational' | 'statutory';
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location?: {
    latitude: number;
    longitude: number;
  };
  observationsCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Observation {
  id: string;
  mineId: string;
  inspectionId?: string;
  reportedBy: string;
  category: 'safety' | 'environmental' | 'operational' | 'compliance' | 'health';
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

export interface CorrectiveAction {
  id: string;
  observationId: string;
  mineId: string;
  /** Human-readable site name (real feed) — optional for legacy mock rows. */
  siteName?: string;
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
  /** Feature 08 — persistent close-out record (1:1 with the corrective action). */
  closeout?: CorrectiveCloseout;
  createdAt: string;
  updatedAt: string;
}

/** Feature 08 — close-out record returned by /corrective-actions/:id. */
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

export interface Document {
  id: string;
  name: string;
  category: string;
  mineId: string;
  uploadedBy: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  entityType: 'mine' | 'inspection' | 'observation' | 'corrective_action' | 'compliance' | 'report';
  entityId: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress: string;
  createdAt: string;
}

export interface RiskAssessment {
  mineId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  factors: Array<{
    label: string;
    score: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  explanation: string;
  recommendations: string[];
  generatedAt: string;
}

export interface DashboardData {
  kpis: {
    totalMines: number;
    complianceRate: number;
    highRiskMines: number;
    pendingInspections: number;
    overdueActions: number;
  };
  complianceTrend: Array<{
    date: string;
    value: number;
  }>;
  riskIntelligence: RiskAssessment[];
  recentObservations: Observation[];
  alerts: Notification[];
}

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

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, any>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface FilterParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}
