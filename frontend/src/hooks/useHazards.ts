import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hazardService } from '@/services/hazardService';
import { queryKeys } from './useMines';
import type { AddHazardControlInput, HazardListParams, RegisterHazardInput } from '@/types';

const invalidateHazards = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.hazards.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.hazards.dashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
};

export const useHazards = (params?: HazardListParams) => {
  return useQuery({
    queryKey: [...queryKeys.hazards.all, params],
    queryFn: () => hazardService.list(params),
  });
};

export const useHazardDashboard = (params?: { siteId?: string }) => {
  return useQuery({
    queryKey: [...queryKeys.hazards.dashboard, params],
    queryFn: () => hazardService.getDashboard(params),
  });
};

export const useRegisterHazard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterHazardInput) => hazardService.register(input),
    onSuccess: () => invalidateHazards(queryClient),
  });
};

export const useAddHazardControl = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddHazardControlInput }) =>
      hazardService.addControl(id, input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hazards.all });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.hazards.detail(vars.id)] });
      queryClient.invalidateQueries({ queryKey: queryKeys.hazards.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
};

export const useImplementHazardControl = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, controlId }: { id: string; controlId: string }) =>
      hazardService.implementControl(id, controlId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hazards.all });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.hazards.detail(vars.id)] });
      queryClient.invalidateQueries({ queryKey: queryKeys.hazards.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
};

export const useAssessHazardEffectiveness = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hazardService.assessEffectiveness(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hazards.all });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.hazards.detail(id)] });
      queryClient.invalidateQueries({ queryKey: queryKeys.hazards.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
};

export const useCloseHazard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, closureNote }: { id: string; closureNote: string }) =>
      hazardService.close(id, closureNote),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hazards.all });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.hazards.detail(vars.id)] });
      queryClient.invalidateQueries({ queryKey: queryKeys.hazards.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
};