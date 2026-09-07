import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import { queryKeys } from './useMines';

export const useDashboard = () => {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: () => analyticsService.getDashboard(),
  });
};
