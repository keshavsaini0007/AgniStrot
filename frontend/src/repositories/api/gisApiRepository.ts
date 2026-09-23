import apiClient, { unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { MapMarker, RiskLayer } from '@/types';

const CATEGORIES: MapMarker['category'][] = ['site', 'inspection', 'incident'];
const BANDS: RiskLayer['riskLevel'][] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

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

  getRiskLayers: async (): Promise<RiskLayer[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GIS.RISK_LAYERS);
      const raw = unwrap<unknown[]>(response.data, []);
      return (Array.isArray(raw) ? raw : []).map(toRiskLayer).filter((layer): layer is RiskLayer => layer !== null);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

/**
 * Normalizes a backend risk-layer aggregate tolerantly; drops entries missing
 * the fields the heatmap needs (band + score + site coordinates).
 */
const toRiskLayer = (raw: unknown): RiskLayer | null => {
  if (!raw || typeof raw !== 'object') return null;
  const l = raw as Record<string, unknown>;
  const band = BANDS.includes(l.riskLevel as RiskLayer['riskLevel']) ? (l.riskLevel as RiskLayer['riskLevel']) : null;
  const location = (l.location ?? {}) as Record<string, unknown>;
  if (!band || typeof l.score !== 'number' || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return null;
  }
  const breakdown = (l.breakdown ?? {}) as Record<string, unknown>;
  const metrics = (l.metrics ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
  const contributors = Array.isArray(l.topContributors)
    ? (l.topContributors as Array<Record<string, unknown>>)
        .filter((c) => c && typeof c.label === 'string' && typeof c.points === 'number' && c.points !== 0)
        .slice(0, 3)
        .map((c) => ({
          key: typeof c.key === 'string' ? c.key : '',
          label: c.label as string,
          points: c.points as number,
          count: num(c.count),
          kind: c.kind === 'relief' ? ('relief' as const) : ('risk' as const),
        }))
    : [];
  return {
    siteId: String(l.siteId ?? ''),
    siteName: String(l.siteName ?? ''),
    subsidiary: String(l.subsidiary ?? ''),
    location: { lat: location.lat, lng: location.lng },
    riskLevel: band,
    score: l.score,
    breakdown: {
      alertScore: num(breakdown.alertScore),
      inspectionScore: num(breakdown.inspectionScore),
      incidentScore: num(breakdown.incidentScore),
      resolutionBonus: num(breakdown.resolutionBonus),
      recurringHazardBonus: num(breakdown.recurringHazardBonus),
      openHazardBonus: num(breakdown.openHazardBonus),
    },
    metrics: {
      totalAlerts: num(metrics.totalAlerts),
      unresolvedAlerts: num(metrics.unresolvedAlerts),
      failedInspections: num(metrics.failedInspections),
      criticalIncidents: num(metrics.criticalIncidents),
      resolutionRate: num(metrics.resolutionRate),
      recurringHazards: num(metrics.recurringHazards),
      openHazards: num(metrics.openHazards),
    },
    topContributors: contributors,
  };
};