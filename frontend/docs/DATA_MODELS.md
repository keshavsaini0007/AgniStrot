# Data Models

This document describes the frontend data models used throughout the application.

## User

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  mineId?: string;
  status: 'active' | 'inactive';
  createdAt: string;  // ISO date
  updatedAt: string;  // ISO date
}

type UserRole = 
  | 'system_admin'
  | 'mine_officer'
  | 'field_inspector'
  | 'department_officer'
  | 'contractor'
  | 'corporate_management'
  | 'regulatory_authority'
  | 'auditor';
```

## Mine

```typescript
interface Mine {
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
  complianceRate: number;    // 0-100
  riskScore: number;         // 0-100
  openObservations: number;
  overdueActions: number;
  lastInspectionAt?: string; // ISO date
  createdAt: string;
  updatedAt: string;
}
```

## Inspection

```typescript
interface Inspection {
  id: string;
  mineId: string;
  inspectorId: string;
  type: 'safety' | 'environmental' | 'operational' | 'statutory';
  scheduledAt: string;      // ISO date
  startedAt?: string;       // ISO date
  completedAt?: string;     // ISO date
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
```

## Observation

```typescript
interface Observation {
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
  evidence: string[];       // File URLs
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedDepartment?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Corrective Action

```typescript
interface CorrectiveAction {
  id: string;
  observationId: string;
  mineId: string;
  assignedTo?: string;
  department?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;          // ISO date
  status: 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'verified' | 'closed';
  resolutionNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;      // ISO date
  createdAt: string;
  updatedAt: string;
}
```

## Compliance Requirement

```typescript
interface ComplianceRequirement {
  id: string;
  mineId: string;
  requirement: string;
  category: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'overdue';
  dueDate: string;          // ISO date
  responsibleDepartment: string;
  documents: string[];      // Document IDs
  lastReviewedAt?: string;  // ISO date
  createdAt: string;
  updatedAt: string;
}
```

## Document

```typescript
interface Document {
  id: string;
  name: string;
  category: string;
  mineId: string;
  uploadedBy: string;
  fileUrl: string;
  fileType: string;         // MIME type
  fileSize: number;         // Bytes
  status: 'active' | 'archived';
  createdAt: string;
}
```

## Notification

```typescript
interface Notification {
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
```

## Audit Log

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string;           // CREATE, UPDATE, DELETE, LOGIN, etc.
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress: string;
  createdAt: string;
}
```

## Risk Assessment

```typescript
interface RiskAssessment {
  mineId: string;
  riskScore: number;        // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;       // 0-1
  factors: Array<{
    label: string;
    score: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  explanation: string;
  recommendations: string[];
  generatedAt: string;      // ISO date
}
```

## Dashboard Data

```typescript
interface DashboardData {
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
```

## API Response Types

### Paginated Response

```typescript
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### API Response

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, any>;
}
```

### Filter Parameters

```typescript
interface FilterParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;      // Additional filters
}
```