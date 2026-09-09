import apiClient, { unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { MapMarker } from '@/types';

/** Backend returns markers already merged from incidents + inspection failures. */
export const gisApiRepository = {
  getMapMarkers: async (): Promise<MapMarker[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GIS.MARKERS);
      return unwrap<MapMarker[]>(response.data, []);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};