// Real backend endpoint map (mirrors `backend/src/routes/**`).
// Every listed endpoint exists in the backend. `mines` maps to the `/sites`
// route; corrective actions + compliance are backend-derived feeds.
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  USERS: {
    LIST: '/users',
    UPDATE: (id: string) => `/users/${id}`,
  },
  INSPECTIONS: {
    BASE: '/inspections',
    SYNC: '/inspections/sync',
  },
  INCIDENTS: {
    BASE: '/incidents',
    SYNC: '/incidents/sync',
  },
  ATTENDANCE: {
    BASE: '/attendance',
    SYNC: '/attendance/sync',
  },
  ALERTS: {
    BASE: '/alerts',
    ACKNOWLEDGE: (id: string) => `/alerts/${id}/acknowledge`,
    RESOLVE: (id: string) => `/alerts/${id}/resolve`,
    ESCALATE: (id: string) => `/alerts/${id}/escalate`,
  },
  DASHBOARD: {
    SUMMARY: '/dashboard/summary',
  },
  AUDIT: {
    BASE: '/audit',
  },
  REPORTS: {
    STATUTORY: '/reports/statutory',
  },
  GIS: {
    MARKERS: '/gis/markers',
  },
  AI: {
    RISK_SCORE: (siteId: string) => `/ai/risk-score/${siteId}`,
    TRENDS: (siteId: string) => `/ai/trends/${siteId}`,
    SUMMARY: '/ai/summary',
  },
  DOCUMENTS: {
    BASE: '/documents',
    INGEST: '/documents/ingest',
    CONFIRM: (id: string) => `/documents/${id}/confirm`,
  },
  CORRECTIVE_ACTIONS: {
    BASE: '/corrective-actions',
    DETAIL: (id: string) => `/corrective-actions/${id}`,
    CLOSE_OUT: (id: string) => `/corrective-actions/${id}/close-out`,
    APPROVE: (id: string) => `/corrective-actions/${id}/approve`,
    REJECT: (id: string) => `/corrective-actions/${id}/reject`,
  },
  COMPLIANCE: {
    BASE: '/compliance',
  },
  MEDIA: {
    UPLOAD: '/media/upload',
  },
  EVIDENCE: {
    BASE: '/evidence',
    DASHBOARD: '/evidence/dashboard',
    VERIFY: (id: string) => `/evidence/${id}/verify`,
    VERIFY_ALL: '/evidence/verify-all',
  },
  HAZARDS: {
    BASE: '/hazards',
    DASHBOARD: '/hazards/dashboard',
    CONTROLS: (id: string) => `/hazards/${id}/controls`,
    IMPLEMENT: (id: string, controlId: string) => `/hazards/${id}/controls/${controlId}/implement`,
    EFFECTIVENESS: (id: string) => `/hazards/${id}/effectiveness`,
    CLOSE: (id: string) => `/hazards/${id}/close`,
  },
} as const;