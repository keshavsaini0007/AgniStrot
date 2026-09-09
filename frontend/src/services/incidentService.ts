import { incidentRepository } from '@/repositories';
import type { Incident, FilterParams, PaginatedResponse, ItemResponse, IncidentSyncPayload } from '@/types';

export const incidentService = {
  getIncidents: async (params?: FilterParams): Promise<PaginatedResponse<Incident>> => {
    return await incidentRepository.getIncidents(params);
  },

  getIncidentById: async (id: string): Promise<ItemResponse<Incident>> => {
    return await incidentRepository.getIncidentById(id);
  },

  syncIncidents: async (records: IncidentSyncPayload[]): Promise<ItemResponse<Incident[]>> => {
    return await incidentRepository.syncIncidents(records);
  },
};