import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { syncService } from '@/services/syncService';
import { queryKeys } from './useMines';

export const syncKeys = {
  status: ['sync', 'status'] as const,
};

export const useSyncStatus = () => {
  return useQuery({
    queryKey: syncKeys.status,
    queryFn: () => syncService.queueStatus(),
    refetchInterval: 15000,
  });
};

export const useTotalPending = () => {
  return useQuery({
    queryKey: ['sync', 'total'] as const,
    queryFn: () => syncService.totalPendingCount(),
    refetchInterval: 15000,
  });
};

export const useSyncNow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncService.syncNow(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: syncKeys.status });
      await queryClient.invalidateQueries({ queryKey: ['sync', 'total'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.inspections.all });
    },
  });
};