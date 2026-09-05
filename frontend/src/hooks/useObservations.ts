import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { observationService } from '@/services/observationService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useObservations = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.observations.all, params],
    queryFn: () => observationService.getObservations(params),
  });
};

export const useObservation = (id: string) => {
  return useQuery({
    queryKey: queryKeys.observations.detail(id),
    queryFn: () => observationService.getObservationById(id),
  });
};

export const useCreateObservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: observationService.createObservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.observations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.mines.all });
    },
  });
};

export const useUpdateObservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => observationService.updateObservation(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.observations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.observations.detail(id) });
    },
  });
};

export const useDeleteObservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: observationService.deleteObservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.observations.all });
    },
  });
};