import { inspectionRepository } from '@/repositories';
import type { Inspection, FilterParams, PaginatedResponse, ItemResponse, InspectionSyncPayload } from '@/types';

export const inspectionService = {
  getInspections: async (params?: FilterParams): Promise<PaginatedResponse<Inspection>> => {
    return await inspectionRepository.getInspections(params);
  },

  getInspectionById: async (id: string): Promise<ItemResponse<Inspection>> => {
    return await inspectionRepository.getInspectionById(id);
  },

  /** Offline-captured inspections → device upload to the backend. */
  syncInspections: async (records: InspectionSyncPayload[]): Promise<ItemResponse<Inspection[]>> => {
    return await inspectionRepository.syncInspections(records);
  },
};