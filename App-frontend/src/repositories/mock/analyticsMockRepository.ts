import type { DashboardData } from '@/types';
import { mockMines, mockObservations, mockNotifications, mockInspections, mockCorrectiveActions, delay } from '@/mock/database';

export const analyticsMockRepository = {
  getDashboard: async (): Promise<DashboardData> => {
    await delay(500);
    const totalMines = mockMines.length;
    const avgCompliance = mockMines.reduce((acc, m) => acc + m.complianceRate, 0) / totalMines;
    const highRiskMines = mockMines.filter((m) => m.riskScore >= 70).length;
    const pendingInspections = mockInspections.filter((i) => i.status === 'scheduled').length;
    const overdueActions = mockCorrectiveActions.filter((a) => {
      const due = new Date(a.dueDate);
      return due < new Date() && a.status !== 'resolved' && a.status !== 'closed';
    }).length;

    return {
      kpis: {
        totalMines,
        complianceRate: Math.round(avgCompliance * 10) / 10,
        highRiskMines,
        pendingInspections,
        overdueActions,
      },
      complianceTrend: [
        { date: '2026-04', value: 82 },
        { date: '2026-05', value: 85 },
        { date: '2026-06', value: 83 },
        { date: '2026-07', value: 87 },
        { date: '2026-08', value: 88 },
      ],
      riskIntelligence: mockMines.map((m) => ({
        mineId: m.id,
        riskScore: m.riskScore,
        riskLevel: m.riskScore >= 80 ? 'critical' as const : m.riskScore >= 60 ? 'high' as const : m.riskScore >= 40 ? 'medium' as const : 'low' as const,
        confidence: 0.85,
        factors: [
          { label: 'Open Observations', score: m.openObservations * 8, severity: m.openObservations > 10 ? 'high' as const : 'medium' as const },
          { label: 'Overdue Actions', score: m.overdueActions * 15, severity: m.overdueActions > 3 ? 'high' as const : 'low' as const },
        ],
        explanation: `Risk assessment based on ${m.openObservations} open observations and ${m.overdueActions} overdue actions.`,
        recommendations: ['Address overdue actions', 'Review open observations'],
        generatedAt: new Date().toISOString(),
      })),
      recentObservations: mockObservations.slice(0, 5),
      alerts: mockNotifications.filter((n) => !n.read).slice(0, 5),
    };
  },
  getCompliance: async (_mineId?: string): Promise<any> => {
    await delay(400);
    return { complianceRate: 87.5, trend: [] };
  },
  getRisk: async (_mineId?: string): Promise<any[]> => {
    await delay(400);
    return [];
  },
  getInspections: async (): Promise<any> => {
    await delay(400);
    return { total: 5, completed: 3, scheduled: 1, inProgress: 1 };
  },
};
