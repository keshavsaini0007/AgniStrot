import { useQuery } from '@tanstack/react-query';
import { auditLogService } from '@/services/auditLogService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useAuditLogs = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.auditLogs.all, params],
    queryFn: () => auditLogService.getAuditLogs(params),
  });
};
