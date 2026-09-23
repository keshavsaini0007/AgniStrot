import { gisRepository } from '@/repositories';
import type { MapMarker, RiskLayer } from '@/types';

export const gisService = {
  getMapMarkers: async (): Promise<MapMarker[]> => {
    return await gisRepository.getMapMarkers();
  },
  getRiskLayers: async (): Promise<RiskLayer[]> => {
    return await gisRepository.getRiskLayers();
  },
};