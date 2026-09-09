import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { queryKeys } from './useMines';

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => dashboardService.getSummary(),
  });
};