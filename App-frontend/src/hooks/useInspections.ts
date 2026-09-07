import { useQuery } from '@tanstack/react-query';
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
