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

// ── Feature 08: close-out loop mutations ─────────────────────────────────────
const invalidateCorrective = (queryClient: ReturnType<typeof useQueryClient>, id: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.correctiveActions.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.correctiveActions.detail(id) });
};

export const useSubmitCloseout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { recommendation: string; effectiveness: string; evidenceNote?: string };
    }) => correctiveActionService.submitCloseout(id, input),
    onSuccess: (_, { id }) => invalidateCorrective(queryClient, id),
  });
};

export const useApproveCloseout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      correctiveActionService.approveCloseout(id, reviewNote),
    onSuccess: (_, { id }) => invalidateCorrective(queryClient, id),
  });
};

export const useRejectCloseout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      correctiveActionService.rejectCloseout(id, reviewNote),
    onSuccess: (_, { id }) => invalidateCorrective(queryClient, id),
  });
};