import { mockIncidents, delay } from '@/mock/database';
import type { Incident, FilterParams, PaginatedResponse, IncidentSyncPayload, ItemResponse } from '@/types';

let incidents = [...mockIncidents];

export const incidentMockRepository = {
  getIncidents: async (params?: FilterParams): Promise<PaginatedResponse<Incident>> => {
    await delay(400);
    let filtered = [...incidents];

    if (params?.siteId) {
      filtered = filtered.filter((i) => i.siteId === params.siteId);
    }
    if (params?.severity || params?.type) {
      const severity = params.severity ?? params.type;
      filtered = filtered.filter((i) => i.severity === severity);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((i) => i.description.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

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

  getIncidentById: async (id: string): Promise<ItemResponse<Incident>> => {
    await delay(300);
    const incident = incidents.find((i) => i.id === id);
    if (!incident) {
      throw new Error('Incident not found');
    }
    return { success: true, data: incident };
  },

  syncIncidents: async (payload: IncidentSyncPayload[]): Promise<ItemResponse<Incident[]>> => {
    await delay(600);
    const synced: Incident[] = payload.map((record, index) => {
      const existing = incidents.find((i) => i.clientUuid === record.clientUuid);
      const incident: Incident = {
        ...record,
        id: existing?.id ?? `inc-${String(incidents.length + index + 1).padStart(3, '0')}`,
      };
      incidents = [incident, ...incidents.filter((i) => i.clientUuid !== record.clientUuid)];
      return incident;
    });
    return { success: true, data: synced };
  },
};