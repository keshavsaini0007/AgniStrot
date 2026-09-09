import { mockInspections, mockSites, delay } from '@/mock/database';
import type { Inspection, FilterParams, PaginatedResponse, InspectionSyncPayload, ItemResponse } from '@/types';

let inspections = [...mockInspections];

const materialize = (list: Inspection[]): Inspection[] => list;

export const inspectionMockRepository = {
  getInspections: async (params?: FilterParams): Promise<PaginatedResponse<Inspection>> => {
    await delay(400);
    let filteredInspections = materialize([...inspections]);

    if (params?.siteId) {
      filteredInspections = filteredInspections.filter((i) => i.siteId === params.siteId);
    }
    if (params?.type) {
      filteredInspections = filteredInspections.filter((i) => i.type === params.type);
    }
    if (params?.search) {
      const q = params.q.toLowerCase();
      filteredInspections = filteredInspections.filter((i) => i.id.toLowerCase().includes(q));
    }

    filteredInspections.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: filteredInspections.slice(start, end),
      meta: {
        page,
        limit,
        total: filteredInspections.length,
        totalPages: Math.ceil(filteredInspections.length / limit),
      },
    };
  },

  getInspectionById: async (id: string): Promise<ItemResponse<Inspection>> => {
    await delay(300);
    const inspection = inspections.find((i) => i.id === id);
    if (!inspection) {
      throw new Error('Inspection not found');
    }
    return { success: true, data: inspection };
  },

  /** Simulates a device → server upload; assigns server ids to synced records. */
  syncInspections: async (payload: InspectionSyncPayload[]): Promise<ItemResponse<Inspection[]>> => {
    await delay(600);
    const synced: Inspection[] = payload.map((record, index) => {
      const existing = inspections.find((i) => i.clientUuid === record.clientUuid);
      const inspection: Inspection = {
        ...record,
        id: existing?.id ?? `insp-${String(inspections.length + index + 1).padStart(3, '0')}`,
        failedCount: record.checklist.filter((c) => c.result === 'fail').length,
      };
      inspections = [inspection, ...inspections.filter((i) => i.clientUuid !== record.clientUuid)];
      return inspection;
    });
    return { success: true, data: synced };
  },
};

export const mockSiteNamesForInspections = (): Record<string, string> => {
  const map: Record<string, string> = {};
  mockSites.forEach((s) => {
    map[s.id] = s.name;
  });
  return map;
};