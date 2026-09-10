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
  },
  COMPLIANCE: {
    BASE: '/compliance',
  },
  MEDIA: {
    UPLOAD: '/media/upload',
  },
} as const;