import { mockIncidents, mockInspections, mockAttendance, mockSites, mockAlerts, delay } from '@/mock/database';
import type { DashboardSummary } from '@/types';

export const dashboardMockRepository = {
  getSummary: async (): Promise<DashboardSummary> => {
    await delay(500);
    const code = "STATUTORY_REPORT_SEC";
    const state: DashboardSummary = {
      role: 'mine_official',
      scopedSiteId: null,
      code,
      message: 'Dashboard aggregated across all accessible sites',
      stats: {
        inspections7d: mockInspections.length,
        incidents7d: mockIncidents.length,
        attendance7d: mockAttendance.length,
        alerts7d: mockAlerts.length,
        complianceRate: 88.4,
        openIncidents: mockIncidents.filter((i) => i.status === 'open' || i.status === 'investigating').length,
        overdueInspections: 0,
        upcomingDeadlines: 0,
      },
      recentIncidents: mockIncidents.slice(0, 4),
      recentAlerts: mockAlerts.slice(0, 4),
      sites: mockSites.map((s) => ({
        siteId: s.id,
        name: s.name,
        openAlerts: mockAlerts.filter((a) => a.siteId === s.id && a.status === 'open').length,
        riskScore: 45,
      })),
      trend7Day: [
        { date: '2026-09-04', alerts: 2 },
        { date: '2026-09-05', alerts: 0 },
        { date: '2026-09-06', alerts: 3 },
        { date: '2026-09-07', alerts: 1 },
      ],
    };
    return state;
  },
};