import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/auditService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useAuditLogs = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.audit.all, params],
    queryFn: () => auditService.getAuditLogs(params),
  });
};