import { gisRepository } from '@/repositories';
import type { MapMarker } from '@/types';

export const gisService = {
  getMapMarkers: async (): Promise<MapMarker[]> => {
    return await gisRepository.getMapMarkers();
  },
};