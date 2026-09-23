import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceService } from '@/services/evidenceService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useEvidence = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.evidence.all, params],
    queryFn: () => evidenceService.getEvidence(params),
  });
};

export const useEvidenceDashboard = () => {
  return useQuery({
    queryKey: queryKeys.evidence.dashboard,
    queryFn: () => evidenceService.getDashboard(),
  });
};

export const useVerifyEvidence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => evidenceService.verify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evidence.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.evidence.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
};

export const useVerifyAllEvidence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => evidenceService.verifyAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evidence.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.evidence.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
};