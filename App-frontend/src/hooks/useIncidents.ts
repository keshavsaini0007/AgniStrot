import { useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentApiRepository } from '@/repositories';
import { syncService } from '@/services/syncService';
import { syncKeys } from './useSync';
import { queryKeys } from './useMines';

export const useQueueIncident = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (record: Record<string, unknown>) => incidentApiRepository.queueIncident(record),
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