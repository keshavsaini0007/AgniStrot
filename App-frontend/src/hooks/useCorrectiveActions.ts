import { useQuery } from '@tanstack/react-query';
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
