import { mockIncidents, mockInspections, mockSites, delay } from '@/mock/database';
import type { MapMarker } from '@/types';

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
};

export const getMockSiteName = (siteId: string): string => {
  return mockSites.find((s) => s.id === siteId)?.name ?? siteId;
};