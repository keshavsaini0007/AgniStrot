import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complianceService } from '@/services/complianceService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useCompliance = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.compliance.all, params],
    queryFn: () => complianceService.getCompliance(params),
  });
};

export const useComplianceRequirement = (id: string) => {
  return useQuery({
    queryKey: queryKeys.compliance.detail(id),
    queryFn: () => complianceService.getComplianceById(id),
  });
};

export const useCreateCompliance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: complianceService.createCompliance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
  });
};

export const useUpdateCompliance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => complianceService.updateCompliance(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.compliance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.compliance.detail(id) });
    },
  });
};