export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    refresh: '/auth/refresh',
  },
  mines: {
    base: '/mines',
    byId: (id: string) => `/mines/${id}`,
  },
  inspections: {
    base: '/inspections',
    byId: (id: string) => `/inspections/${id}`,
  },
  observations: {
    base: '/observations',
    byId: (id: string) => `/observations/${id}`,
  },
  correctiveActions: {
    base: '/corrective-actions',
    byId: (id: string) => `/corrective-actions/${id}`,
  },
  compliance: {
    base: '/compliance',
    byId: (id: string) => `/compliance/${id}`,
  },
  documents: {
    base: '/documents',
    byId: (id: string) => `/documents/${id}`,
  },
  notifications: {
    base: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
  },
  analytics: {
    dashboard: '/analytics/dashboard',
    compliance: '/analytics/compliance',
    risk: '/analytics/risk',
    inspections: '/analytics/inspections',
  },
  users: {
    base: '/users',
    byId: (id: string) => `/users/${id}`,
  },
  auditLogs: {
    base: '/audit-logs',
  },
  reports: {
    generate: '/reports/generate',
    base: '/reports',
    byId: (id: string) => `/reports/${id}`,
  },
} as const;
