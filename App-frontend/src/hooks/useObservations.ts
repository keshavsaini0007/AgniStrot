import { useQuery } from '@tanstack/react-query';
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
