import { authMockRepository } from './mock/authMockRepository';
import { mineMockRepository } from './mock/mineMockRepository';
import { inspectionMockRepository } from './mock/inspectionMockRepository';
import { observationMockRepository } from './mock/observationMockRepository';
import { correctiveActionMockRepository } from './mock/correctiveActionMockRepository';
import { complianceMockRepository } from './mock/complianceMockRepository';
import { notificationMockRepository } from './mock/notificationMockRepository';
import { analyticsMockRepository } from './mock/analyticsMockRepository';

// For now, always use mock repositories
// When backend is ready, switch to API repositories
const useMockApi = true;

export const authRepository = useMockApi ? authMockRepository : authMockRepository;
export const mineRepository = useMockApi ? mineMockRepository : mineMockRepository;
export const inspectionRepository = useMockApi ? inspectionMockRepository : inspectionMockRepository;
export const observationRepository = useMockApi ? observationMockRepository : observationMockRepository;
export const correctiveActionRepository = useMockApi ? correctiveActionMockRepository : correctiveActionMockRepository;
export const complianceRepository = useMockApi ? complianceMockRepository : complianceMockRepository;
export const notificationRepository = useMockApi ? notificationMockRepository : notificationMockRepository;
export const analyticsRepository = useMockApi ? analyticsMockRepository : analyticsMockRepository;
