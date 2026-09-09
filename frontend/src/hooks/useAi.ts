import { useQuery } from '@tanstack/react-query';
import { aiService } from '@/services/aiService';
import { queryKeys } from './useMines';

export const useRiskScore = (siteId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.ai.risk, siteId],
    queryFn: () => {
      if (!siteId) throw new Error('siteId required');
      return aiService.getRiskScore(siteId);
    },
    enabled: Boolean(siteId),
  });
};

export const useTrends = (siteId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.ai.trends, siteId],
    queryFn: () => {
      if (!siteId) throw new Error('siteId required');
      return aiService.getTrends(siteId);
    },
    enabled: Boolean(siteId),
  });
};

export const useAiSummary = () => {
  return useQuery({
    queryKey: queryKeys.ai.summary,
    queryFn: () => aiService.getSummary(),
  });
};