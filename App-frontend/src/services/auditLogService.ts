import { auditLogRepository } from '@/repositories';
import type { AuditLog, FilterParams, PaginatedResponse } from '@/types';

export const auditLogService = {
  getAuditLogs: async (params?: FilterParams): Promise<PaginatedResponse<AuditLog>> => {
    return await auditLogRepository.getAuditLogs(params);
  },
};
