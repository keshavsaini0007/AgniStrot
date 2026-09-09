import { env } from '@/config/env';
import {
  authMockRepository,
  mineMockRepository,
  inspectionMockRepository,
  incidentMockRepository,
  attendanceMockRepository,
  alertMockRepository,
  auditMockRepository,
  reportMockRepository,
  gisMockRepository,
  documentMockRepository,
  dashboardMockRepository,
  aiMockRepository,
  correctiveActionMockRepository,
  complianceMockRepository,
  notificationMockRepository,
} from './mock';
import {
  authApiRepository,
  inspectionApiRepository,
  incidentApiRepository,
  attendanceApiRepository,
  alertApiRepository,
  auditApiRepository,
  reportApiRepository,
  gisApiRepository,
  documentApiRepository,
  dashboardApiRepository,
  aiApiRepository,
} from './api';

const useMockApi = env.USE_MOCK_API;

/**
 * Backend-backed domains — switch on VITE_USE_MOCK_API. Every contract matches
 * the backend routes 1:1, so the frontend can connect to any backend implement-
 * ing the AgniStrot contract.
 */
export const authRepository = useMockApi ? authMockRepository : authApiRepository;
export const inspectionRepository = useMockApi ? inspectionMockRepository : inspectionApiRepository;
export const incidentRepository = useMockApi ? incidentMockRepository : incidentApiRepository;
export const attendanceRepository = useMockApi ? attendanceMockRepository : attendanceApiRepository;
export const alertRepository = useMockApi ? alertMockRepository : alertApiRepository;
export const auditRepository = useMockApi ? auditMockRepository : auditApiRepository;
export const reportRepository = useMockApi ? reportMockRepository : reportApiRepository;
export const gisRepository = useMockApi ? gisMockRepository : gisApiRepository;
export const documentRepository = useMockApi ? documentMockRepository : documentApiRepository;
export const dashboardRepository = useMockApi ? dashboardMockRepository : dashboardApiRepository;
export const aiRepository = useMockApi ? aiMockRepository : aiApiRepository;

/**
 * Pitch-only / demo modules — the backend has no endpoints for these. They are
 * locked to the mock implementations and gated behind VITE_DEMO_FEATURES in the
 * UI (see config/env + pages).
 */
export const mineRepository = mineMockRepository;
export const correctiveActionRepository = correctiveActionMockRepository;
export const complianceRepository = complianceMockRepository;
export const notificationRepository = notificationMockRepository;