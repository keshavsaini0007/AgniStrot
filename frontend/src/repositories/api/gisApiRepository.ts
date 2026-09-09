import apiClient, { unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { MapMarker } from '@/types';

const CATEGORIES: MapMarker['category'][] = ['site', 'inspection', 'incident'];

/**
 * Normalizes a marker into the frontend `MapMarker` shape, tolerating
 * `{ lat, lng }`, `{ latitude, longitude }`, or GeoJSON `{ coordinates: [lng, lat] }`.
 * Markers without valid coordinates are dropped.
 */
const toMarker = (raw: unknown): MapMarker | null => {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;

  let lat = m.lat ?? m.latitude;
  let lng = m.lng ?? m.longitude;
  if ((typeof lat !== 'number' || typeof lng !== 'number') && Array.isArray(m.coordinates)) {
    lng = m.coordinates[0];
    lat = m.coordinates[1];
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const category = CATEGORIES.includes(m.category as MapMarker['category'])
    ? (m.category as MapMarker['category'])
    : 'site';

  return {
    id: String(m.id ?? ''),
    category,
    lat,
    lng,
    siteId: String(m.siteId ?? ''),
    siteName: m.siteName ? String(m.siteName) : '',
    title: m.title ? String(m.title) : '',
    severity: (m.severity as MapMarker['severity']) ?? undefined,
    status: m.status ? String(m.status) : undefined,
    timestamp: m.timestamp ? String(m.timestamp) : undefined,
  };
};

/** Backend returns markers already merged from incidents + inspection failures. */
export const gisApiRepository = {
  getMapMarkers: async (): Promise<MapMarker[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GIS.MARKERS);
      const raw = unwrap<unknown[]>(response.data, []);
      return (Array.isArray(raw) ? raw : []).map(toMarker).filter((marker): marker is MapMarker => marker !== null);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};