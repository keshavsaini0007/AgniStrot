import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/reportService';
import { queryKeys } from './useMines';
import type { StatutoryReportQuery } from '@/types';

/** Query-triggered download; pages usually call the imperative service for blobs. */
export const useStatutoryReport = (query?: StatutoryReportQuery, enabled = false) => {
  return useQuery({
    queryKey: [...queryKeys.reports.all, query],
    queryFn: async () => {
      if (!query) throw new Error('Report query missing');
      return reportService.getStatutoryReport(query);
    },
    enabled,
  });
};