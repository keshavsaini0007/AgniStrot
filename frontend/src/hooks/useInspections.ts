import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionService } from '@/services/inspectionService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useInspections = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.inspections.all, params],
    queryFn: () => inspectionService.getInspections(params),
  });
};

export const useInspection = (id: string) => {
  return useQuery({
    queryKey: queryKeys.inspections.detail(id),
    queryFn: () => inspectionService.getInspectionById(id),
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inspectionService.createInspection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections.all });
    },
  });
};

export const useUpdateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inspectionService.updateInspection(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(id) });
    },
  });
};

export const useDeleteInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inspectionService.deleteInspection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections.all });
    },
  });
};