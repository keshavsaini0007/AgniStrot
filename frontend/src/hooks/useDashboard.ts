import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from './useMines';

export const useDashboardSummary = () => {
  const role = useAuthStore((s) => s.user?.role);
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => dashboardService.getSummary(role ?? 'field_officer'),
    enabled: !!role,
  });
};