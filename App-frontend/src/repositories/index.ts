import { authMockRepository } from './mock/authMockRepository';
import { mineMockRepository } from './mock/mineMockRepository';
import { inspectionMockRepository } from './mock/inspectionMockRepository';
import { observationMockRepository } from './mock/observationMockRepository';
import { complianceMockRepository } from './mock/complianceMockRepository';
import { notificationMockRepository } from './mock/notificationMockRepository';
import { analyticsMockRepository } from './mock/analyticsMockRepository';
import { documentMockRepository } from './mock/documentMockRepository';
import { auditLogMockRepository } from './mock/auditLogMockRepository';
import { authApiRepository } from './api/authApiRepository';
import { userApiRepository } from './api/userApiRepository';
import { correctiveActionApiRepository } from './api/correctiveActionApiRepository';
import { inspectionApiRepository } from './api/inspectionApiRepository';
import { incidentApiRepository } from './api/incidentApiRepository';
import { attendanceApiRepository } from './api/attendanceApiRepository';
import { mediaApiRepository } from './api/mediaApiRepository';

// Live mode: auth + inspections + attendance + media already talk to the real
// backend (/backend). Feature 07/08 parity switches the user directory and the
// corrective-actions feed to the real API too (both were mock-locked). The live
// site list powers the manage-user modal's site picker.
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
export const correctiveActionRepository = correctiveActionApiRepository;
export const complianceRepository = useMockApi
  ? complianceMockRepository
  : complianceMockRepository;
export const notificationRepository = useMockApi
  ? notificationMockRepository
  : notificationMockRepository;
export const analyticsRepository = useMockApi
  ? analyticsMockRepository
  : analyticsMockRepository;
export const userRepository = userApiRepository;
export const documentRepository = useMockApi
  ? documentMockRepository
  : documentMockRepository;
export const auditLogRepository = useMockApi
  ? auditLogMockRepository
  : auditLogMockRepository;

export { inspectionApiRepository, incidentApiRepository, attendanceApiRepository, mediaApiRepository };

/** Live sites for the manage-user modal picker (always API-backed). */
export { siteApiRepository as siteRepository } from './api/siteApiRepository';