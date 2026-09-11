import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertService } from '@/services/alertService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useAlerts = (params?: FilterParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.alerts.all, params],
    queryFn: () => alertService.getAlerts(params),
    enabled: options?.enabled ?? true,
  });
};

const invalidateOnAction = (queryClient: ReturnType<typeof useQueryClient>, id: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
  queryClient.invalidateQueries({ queryKey: ['alerts', id] });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => alertService.acknowledge(id, note),
    onSuccess: (_, { id }) => invalidateOnAction(queryClient, id),
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => alertService.resolve(id, note),
    onSuccess: (_, { id }) => invalidateOnAction(queryClient, id),
  });
};

export const useEscalateAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => alertService.escalate(id, note),
    onSuccess: (_, { id }) => invalidateOnAction(queryClient, id),
  });
};