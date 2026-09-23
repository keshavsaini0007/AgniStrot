import { useQuery } from '@tanstack/react-query';
import { gisService } from '@/services/gisService';
import { queryKeys } from './useMines';

/** Risk heatmap layers for the GIS page (role-scoped on the backend). */
export const useRiskLayers = () => {
  return useQuery({
    queryKey: queryKeys.gis.riskLayers,
    queryFn: () => gisService.getRiskLayers(),
  });
};