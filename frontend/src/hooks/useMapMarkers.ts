import { useQuery } from '@tanstack/react-query';
import { gisService } from '@/services/gisService';
import { queryKeys } from './useMines';

export const useMapMarkers = () => {
  return useQuery({
    queryKey: queryKeys.gis.all,
    queryFn: () => gisService.getMapMarkers(),
  });
};