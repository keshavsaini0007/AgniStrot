import { auditRepository } from '@/repositories';
import type { AuditLog, FilterParams, PaginatedResponse } from '@/types';

export const auditService = {
  getAuditLogs: async (params?: FilterParams): Promise<PaginatedResponse<AuditLog>> => {
    return await auditRepository.getAuditLogs(params);
  },
};