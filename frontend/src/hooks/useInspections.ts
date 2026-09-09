import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionService } from '@/services/inspectionService';
import { queryKeys } from './useMines';
import type { FilterParams, InspectionSyncPayload } from '@/types';

export const useInspections = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.inspections.all, params],
    queryFn: () => inspectionService.getInspections(params),
  });
};

export const useInspection = (id: string) => {
  return useQuery({
    queryKey: queryKeys.inspections.detail(id),
    queryFn: async () => (await inspectionService.getInspectionById(id)).data,
  });
};

export const useSyncInspections = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (records: InspectionSyncPayload[]) => {
      const result = await inspectionService.syncInspections(records);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections.all });
    },
  });
};