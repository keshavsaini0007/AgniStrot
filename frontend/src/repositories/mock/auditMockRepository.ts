import { mockAuditLogs, delay } from '@/mock/database';
import type { AuditLog, FilterParams, PaginatedResponse } from '@/types';

let auditLogs = [...mockAuditLogs];

export const auditMockRepository = {
  getAuditLogs: async (params?: FilterParams): Promise<PaginatedResponse<AuditLog>> => {
    await delay(400);
    let filtered = [...auditLogs];

    if (params?.type) {
      filtered = filtered.filter((l) => l.entityType === params.type);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (l) => l.action.toLowerCase().includes(q) || l.entityId.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: filtered.slice(start, end),
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  },
};