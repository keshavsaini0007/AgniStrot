import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import { queryKeys } from './useMines';

export const useDashboardData = () => {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: () => analyticsService.getDashboard(),
  });
};

export const useComplianceAnalytics = (mineId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.analytics.compliance, mineId],
    queryFn: () => analyticsService.getCompliance(mineId),
  });
};

export const useRiskAnalytics = (mineId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.analytics.risk, mineId],
    queryFn: () => analyticsService.getRisk(mineId),
  });
};

export const useInspectionAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.analytics.inspections,
    queryFn: () => analyticsService.getInspections(),
  });
};