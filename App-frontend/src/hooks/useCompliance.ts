import { useQuery } from '@tanstack/react-query';
import { complianceService } from '@/services/complianceService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useCompliance = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.compliance.all, params],
    queryFn: () => complianceService.getCompliance(params),
  });
};
