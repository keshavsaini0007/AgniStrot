import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { correctiveActionService } from '@/services/correctiveActionService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useCorrectiveActions = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.correctiveActions.all, params],
    queryFn: () => correctiveActionService.getCorrectiveActions(params),
  });
};

export const useCorrectiveAction = (id: string) => {
  return useQuery({
    queryKey: queryKeys.correctiveActions.detail(id),
    queryFn: () => correctiveActionService.getCorrectiveActionById(id),
  });
};

export const useCreateCorrectiveAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: correctiveActionService.createCorrectiveAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.correctiveActions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.observations.all });
    },
  });
};

export const useUpdateCorrectiveAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => correctiveActionService.updateCorrectiveAction(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.correctiveActions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.correctiveActions.detail(id) });
    },
  });
};