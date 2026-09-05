import { env } from '@/config/env';
import { authMockRepository, mineMockRepository, inspectionMockRepository, observationMockRepository, correctiveActionMockRepository, complianceMockRepository, notificationMockRepository, analyticsMockRepository } from './mock';
import { authApiRepository, mineApiRepository } from './api';

const useMockApi = env.USE_MOCK_API;

export const authRepository = useMockApi ? authMockRepository : authApiRepository;
export const mineRepository = useMockApi ? mineMockRepository : mineApiRepository;
export const inspectionRepository = useMockApi ? inspectionMockRepository : {
  getInspections: async () => { throw new Error('Not implemented'); },
  getInspectionById: async () => { throw new Error('Not implemented'); },
  createInspection: async () => { throw new Error('Not implemented'); },
  updateInspection: async () => { throw new Error('Not implemented'); },
  deleteInspection: async () => { throw new Error('Not implemented'); },
};
export const observationRepository = useMockApi ? observationMockRepository : {
  getObservations: async () => { throw new Error('Not implemented'); },
  getObservationById: async () => { throw new Error('Not implemented'); },
  createObservation: async () => { throw new Error('Not implemented'); },
  updateObservation: async () => { throw new Error('Not implemented'); },
  deleteObservation: async () => { throw new Error('Not implemented'); },
};
export const correctiveActionRepository = useMockApi ? correctiveActionMockRepository : {
  getCorrectiveActions: async () => { throw new Error('Not implemented'); },
  getCorrectiveActionById: async () => { throw new Error('Not implemented'); },
  createCorrectiveAction: async () => { throw new Error('Not implemented'); },
  updateCorrectiveAction: async () => { throw new Error('Not implemented'); },
};
export const complianceRepository = useMockApi ? complianceMockRepository : {
  getCompliance: async () => { throw new Error('Not implemented'); },
  getComplianceById: async () => { throw new Error('Not implemented'); },
  createCompliance: async () => { throw new Error('Not implemented'); },
  updateCompliance: async () => { throw new Error('Not implemented'); },
};
export const notificationRepository = useMockApi ? notificationMockRepository : {
  getNotifications: async () => { throw new Error('Not implemented'); },
  markAsRead: async () => { throw new Error('Not implemented'); },
  markAllAsRead: async () => { throw new Error('Not implemented'); },
  getUnreadCount: async () => { throw new Error('Not implemented'); },
};
export const analyticsRepository = useMockApi ? analyticsMockRepository : {
  getDashboard: async () => { throw new Error('Not implemented'); },
  getCompliance: async () => { throw new Error('Not implemented'); },
  getRisk: async () => { throw new Error('Not implemented'); },
  getInspections: async () => { throw new Error('Not implemented'); },
};