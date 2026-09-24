import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { correctiveActionService } from '@/services/correctiveActionService';
import { queryKeys } from './useMines';
import type { CorrectiveCloseout, FilterParams } from '@/types';

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

function useCloseoutInvalidation() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.correctiveActions.all });
    if (id) queryClient.invalidateQueries({ queryKey: queryKeys.correctiveActions.detail(id) });
  };
}

/** Feature 08 — submit close-out evidence (mine_official own-site / corporate). */
export const useSubmitCloseout = () => {
  const invalidate = useCloseoutInvalidation();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { recommendation: string; effectiveness: string; evidenceNote?: string };
    }): Promise<CorrectiveCloseout> => correctiveActionService.submitCloseout(id, input),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
};

/** Feature 08 — corporate sign-off. */
export const useApproveCloseout = () => {
  const invalidate = useCloseoutInvalidation();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }): Promise<CorrectiveCloseout> =>
      correctiveActionService.approveCloseout(id, reviewNote),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
};

/** Feature 08 — send back for resubmission. */
export const useRejectCloseout = () => {
  const invalidate = useCloseoutInvalidation();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }): Promise<CorrectiveCloseout> =>
      correctiveActionService.rejectCloseout(id, reviewNote),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
};