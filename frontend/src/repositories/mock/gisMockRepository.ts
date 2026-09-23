import { mockIncidents, mockInspections, mockSites, delay } from '@/mock/database';
import type { MapMarker, RiskLayer } from '@/types';

/** Deterministic demo bands so the heatmap renders in the mock build. */
const MOCK_BANDS: Array<{ id: string; band: RiskLayer['riskLevel']; score: number }> = [
  { id: 'mine-001', band: 'HIGH', score: 58 },
  { id: 'mine-002', band: 'CRITICAL', score: 74 },
  { id: 'mine-003', band: 'MEDIUM', score: 42 },
  { id: 'mine-004', band: 'LOW', score: 18 },
  { id: 'mine-005', band: 'MEDIUM', score: 36 },
];

export const gisMockRepository = {
  getMapMarkers: async (): Promise<MapMarker[]> => {
    await delay(500);
    const markers: MapMarker[] = [
      ...mockIncidents.map((inc) => ({
        id: inc.id,
        lat: inc.location?.lat ?? mockSites.find((s) => s.id === inc.siteId)?.location.lat ?? 23.34,
        lng: inc.location?.lng ?? mockSites.find((s) => s.id === inc.siteId)?.location.lng ?? 85.3,
        category: 'incident' as const,
        siteId: inc.siteId,
        siteName: getMockSiteName(inc.siteId),
        title: `[${inc.severity}] ${inc.category}`,
        severity: inc.severity,
        status: inc.status,
        timestamp: inc.capturedAt,
      })),
      ...mockInspections
        .filter((i) => (i.failedCount ?? 0) > 0)
        .map((i) => ({
          id: i.id,
          lat: i.location?.lat ?? mockSites.find((s) => s.id === i.siteId)?.location.lat ?? 23.34,
          lng: i.location?.lng ?? mockSites.find((s) => s.id === i.siteId)?.location.lng ?? 85.3,
          category: 'inspection' as const,
          siteId: i.siteId,
          siteName: getMockSiteName(i.siteId),
          title: `${i.type} inspection failures (${i.failedCount ?? 0})`,
          severity: (i.failedCount ?? 0) >= 2 ? ('high' as const) : ('medium' as const),
          status: 'open' as const,
          timestamp: i.capturedAt,
        })),
    ];
    return markers;
  },

  getRiskLayers: async (): Promise<RiskLayer[]> => {
    await delay(500);
    return mockSites.map((site) => {
      const bandInfo = MOCK_BANDS.find((b) => b.id === site.id) ?? { band: 'MEDIUM' as const, score: 40 };
      return {
        siteId: site.id,
        siteName: site.name,
        subsidiary: site.subsidiary ?? '',
        location: site.location,
        riskLevel: bandInfo.band,
        score: bandInfo.score,
        breakdown: {
          alertScore: 10,
          inspectionScore: 8,
          incidentScore: 6,
          resolutionBonus: 4,
          recurringHazardBonus: 2,
          openHazardBonus: 3,
        },
        metrics: {
          totalAlerts: 4,
          unresolvedAlerts: 2,
          failedInspections: 1,
          criticalIncidents: 0,
          resolutionRate: 50,
          recurringHazards: 1,
          openHazards: 2,
        },
        topContributors: [
          { key: 'alerts', label: 'Alert pressure', points: 10, count: 4, kind: 'risk' },
          { key: 'inspections', label: 'Failed inspections', points: 8, count: 1, kind: 'risk' },
          { key: 'resolution_rate', label: 'Resolution rate', points: -4, count: 50, kind: 'relief' },
        ],
      };
    });
  },
};

export const getMockSiteName = (siteId: string): string => {
  return mockSites.find((s) => s.id === siteId)?.name ?? siteId;
};