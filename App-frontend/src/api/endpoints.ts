export const endpoints = {
  auth: {
    login: '/auth/login',
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