import type { AuditLog, FilterParams, PaginatedResponse } from '@/types';
import { mockAuditLogs, delay } from '@/mock/database';

let auditLogs = [...mockAuditLogs];

export const auditLogMockRepository = {
  getAuditLogs: async (params?: FilterParams): Promise<PaginatedResponse<AuditLog>> => {
    await delay(400);
    let filtered = [...auditLogs];
    if (params?.action) {
      filtered = filtered.filter((l) => l.action === params.action);
    }
    if (params?.entityType) {
      filtered = filtered.filter((l) => l.entityType === params.entityType);
    }
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    return {
      success: true,
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },
};
