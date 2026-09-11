import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inspectionService } from '@/services/inspectionService';
import { syncService } from '@/services/syncService';
import { queryKeys } from './useMines';
import { syncKeys } from './useSync';
import type { FilterParams } from '@/types';

export const useInspections = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.inspections.all, params],
    queryFn: () => inspectionService.getInspections(params),
  });
};

export const useInspection = (id: string) => {
  return useQuery({
    queryKey: queryKeys.inspections.detail(id),
    queryFn: () => inspectionService.getInspectionById(id),
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (record: Record<string, unknown>) =>
      inspectionService.createInspectionRecord(record),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: syncKeys.status });
      await queryClient.invalidateQueries({ queryKey: ['sync', 'total'] });
      syncService
        .syncNow()
        .then(() => {
          queryClient.invalidateQueries({ queryKey: syncKeys.status });
          queryClient.invalidateQueries({ queryKey: queryKeys.inspections.all });
        })
        .catch(() => {});
    },
  });
};
