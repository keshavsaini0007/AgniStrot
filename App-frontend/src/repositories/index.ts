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
import { authApiRepository } from './api/authApiRepository';
import { inspectionApiRepository } from './api/inspectionApiRepository';
import { incidentApiRepository } from './api/incidentApiRepository';
import { attendanceApiRepository } from './api/attendanceApiRepository';
import { mediaApiRepository } from './api/mediaApiRepository';

// When live = true, auth + inspections talk to the real backend (/backend).
// Screens without a live backend endpoint (mines, observations, notifications,
// analytics, reports, audit, users, documents, corrective actions, compliance)
// continue to resolve against the mock repositories — there is no API to hit.
const useMockApi = false;

export const authRepository = useMockApi ? authMockRepository : authApiRepository;
export const mineRepository = useMockApi ? mineMockRepository : mineMockRepository;
export const inspectionRepository = useMockApi
  ? inspectionMockRepository
  : inspectionApiRepository;
export const attendanceRepository = attendanceApiRepository; // Always use API repository
export const observationRepository = useMockApi
  ? observationMockRepository
  : observationMockRepository;
export const correctiveActionRepository = useMockApi
  ? correctiveActionMockRepository
  : correctiveActionMockRepository;
export const complianceRepository = useMockApi
  ? complianceMockRepository
  : complianceMockRepository;
export const notificationRepository = useMockApi
  ? notificationMockRepository
  : notificationMockRepository;
export const analyticsRepository = useMockApi
  ? analyticsMockRepository
  : analyticsMockRepository;
export const userRepository = useMockApi ? userMockRepository : userMockRepository;
export const documentRepository = useMockApi
  ? documentMockRepository
  : documentMockRepository;
export const auditLogRepository = useMockApi
  ? auditLogMockRepository
  : auditLogMockRepository;

export { inspectionApiRepository, incidentApiRepository, attendanceApiRepository, mediaApiRepository };