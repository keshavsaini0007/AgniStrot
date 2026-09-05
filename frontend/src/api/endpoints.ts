export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  MINES: {
    BASE: '/mines',
    BY_ID: (id: string) => `/mines/${id}`,
  },
  INSPECTIONS: {
    BASE: '/inspections',
    BY_ID: (id: string) => `/inspections/${id}`,
  },
  OBSERVATIONS: {
    BASE: '/observations',
    BY_ID: (id: string) => `/observations/${id}`,
  },
  CORRECTIVE_ACTIONS: {
    BASE: '/corrective-actions',
    BY_ID: (id: string) => `/corrective-actions/${id}`,
  },
  COMPLIANCE: {
    BASE: '/compliance',
    BY_ID: (id: string) => `/compliance/${id}`,
  },
  DOCUMENTS: {
    BASE: '/documents',
    BY_ID: (id: string) => `/documents/${id}`,
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
  },
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    COMPLIANCE: '/analytics/compliance',
    RISK: '/analytics/risk',
    INSPECTIONS: '/analytics/inspections',
  },
  GIS: {
    MINES: '/gis/mines',
    OBSERVATIONS: '/gis/observations',
    INSPECTIONS: '/gis/inspections',
  },
  REPORTS: {
    GENERATE: '/reports/generate',
    BASE: '/reports',
    BY_ID: (id: string) => `/reports/${id}`,
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
  },
  AUDIT_LOGS: {
    BASE: '/audit-logs',
    BY_ID: (id: string) => `/audit-logs/${id}`,
  },
} as const;