import { mockAlerts, delay } from '@/mock/database';
import type { Alert, FilterParams, PaginatedResponse, ItemResponse } from '@/types';

let alerts = [...mockAlerts];

const persistStatus = (id: string, status: Alert['status']): Alert => {
  const index = alerts.findIndex((a) => a.id === id);
  if (index === -1) throw new Error('Alert not found');
  alerts[index] = { ...alerts[index], status };
  return alerts[index];
};

export const alertMockRepository = {
  getAlerts: async (params?: FilterParams): Promise<PaginatedResponse<Alert>> => {
    await delay(400);
    let filtered = [...alerts];

    if (params?.siteId) {
      filtered = filtered.filter((a) => a.siteId === params.siteId);
    }
    if (params?.status) {
      filtered = filtered.filter((a) => a.status === params.status);
    }
    if (params?.severity || params?.type) {
      const severity = params.severity ?? params.type;
      filtered = filtered.filter((a) => a.severity === severity);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((a) => (a.ruleCode ?? '').toLowerCase().includes(q));
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

  acknowledge: async (id: string): Promise<ItemResponse<Alert>> => {
    await delay(300);
    return { success: true, data: persistStatus(id, 'acknowledged') };
  },

  resolve: async (id: string): Promise<ItemResponse<Alert>> => {
    await delay(300);
    return { success: true, data: persistStatus(id, 'closed') };
  },

  escalate: async (id: string): Promise<ItemResponse<Alert>> => {
    await delay(300);
    return { success: true, data: persistStatus(id, 'escalated') };
  },
};