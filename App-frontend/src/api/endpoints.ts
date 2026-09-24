export const endpoints = {
  auth: {
    login: '/auth/login',
  },
  users: {
    list: '/users',
    update: (id: string) => `/users/${id}`,
  },
  correctiveActions: {
    list: '/corrective-actions',
    detail: (id: string) => `/corrective-actions/${id}`,
    closeOut: (id: string) => `/corrective-actions/${id}/close-out`,
    approve: (id: string) => `/corrective-actions/${id}/approve`,
    reject: (id: string) => `/corrective-actions/${id}/reject`,
  },
  sites: {
    list: '/sites',
  },
  inspections: {
    list: '/inspections',
    detail: (id: string) => `/inspections/${id}`,
    sync: '/inspections/sync',
  },
  incidents: {
    sync: '/incidents/sync',
  },
  attendance: {
    sync: '/attendance/sync',
  },
  media: {
    upload: '/media/upload',
  },
} as const;