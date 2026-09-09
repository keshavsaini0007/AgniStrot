import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '@/services/incidentService';
import { queryKeys } from './useMines';
import type { FilterParams, IncidentSyncPayload } from '@/types';

export const useIncidents = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.incidents.all, params],
    queryFn: () => incidentService.getIncidents(params),
  });
};

export const useIncident = (id: string) => {
  return useQuery({
    queryKey: queryKeys.incidents.detail(id),
    queryFn: async () => (await incidentService.getIncidentById(id)).data,
  });
};

export const useSyncIncidents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (records: IncidentSyncPayload[]) => {
      const result = await incidentService.syncIncidents(records);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all });
    },
  });
};