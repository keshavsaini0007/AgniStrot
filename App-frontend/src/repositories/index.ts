import { authMockRepository } from './mock/authMockRepository';
import { mineMockRepository } from './mock/mineMockRepository';
import { inspectionMockRepository } from './mock/inspectionMockRepository';
import { observationMockRepository } from './mock/observationMockRepository';
import { correctiveActionMockRepository } from './mock/correctiveActionMockRepository';
import { complianceMockRepository } from './mock/complianceMockRepository';
import { notificationMockRepository } from './mock/notificationMockRepository';
import { analyticsMockRepository } from './mock/analyticsMockRepository';
import { userMockRepository } from './mock/userMockRepository';
import { documentMockRepository } from './mock/documentMockRepository';
import { auditLogMockRepository } from './mock/auditLogMockRepository';

const useMockApi = true;

export const authRepository = useMockApi ? authMockRepository : authMockRepository;
export const mineRepository = useMockApi ? mineMockRepository : mineMockRepository;
export const inspectionRepository = useMockApi ? inspectionMockRepository : inspectionMockRepository;
export const observationRepository = useMockApi ? observationMockRepository : observationMockRepository;
export const correctiveActionRepository = useMockApi ? correctiveActionMockRepository : correctiveActionMockRepository;
export const complianceRepository = useMockApi ? complianceMockRepository : complianceMockRepository;
export const notificationRepository = useMockApi ? notificationMockRepository : notificationMockRepository;
export const analyticsRepository = useMockApi ? analyticsMockRepository : analyticsMockRepository;
export const userRepository = useMockApi ? userMockRepository : userMockRepository;
export const documentRepository = useMockApi ? documentMockRepository : documentMockRepository;
export const auditLogRepository = useMockApi ? auditLogMockRepository : auditLogMockRepository;
