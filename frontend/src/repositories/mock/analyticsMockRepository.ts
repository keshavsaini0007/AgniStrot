import { mockMines, mockObservations, mockCorrectiveActions, mockInspections, delay } from '@/mock/database';
import type { DashboardData, RiskAssessment } from '@/types';

export const analyticsMockRepository = {
  getDashboard: async (): Promise<DashboardData> => {
    await delay(500);
    
    const totalMines = mockMines.length;
    const activeMines = mockMines.filter(m => m.status === 'active');
    const complianceRate = activeMines.reduce((sum, m) => sum + m.complianceRate, 0) / activeMines.length;
    const highRiskMines = mockMines.filter(m => m.riskScore >= 70).length;
    const pendingInspections = mockInspections.filter(i => i.status === 'scheduled').length;
    const overdueActions = mockCorrectiveActions.filter(a => 
      a.status !== 'closed' && a.status !== 'verified' && new Date(a.dueDate) < new Date()
    ).length;

    return {
      kpis: {
        totalMines,
        complianceRate: Math.round(complianceRate * 10) / 10,
        highRiskMines,
        pendingInspections,
        overdueActions,
      },
      complianceTrend: [
        { date: '2026-04', value: 89 },
        { date: '2026-05', value: 90 },
        { date: '2026-06', value: 91.5 },
        { date: '2026-07', value: 92 },
        { date: '2026-08', value: 93.1 },
        { date: '2026-09', value: Math.round(complianceRate * 10) / 10 },
      ],
      riskIntelligence: mockMines.slice(0, 3).map(mine => ({
        mineId: mine.id,
        riskScore: mine.riskScore,
        riskLevel: mine.riskScore >= 70 ? 'high' : mine.riskScore >= 40 ? 'medium' : 'low',
        confidence: 0.85,
        factors: [
          { label: 'Safety Compliance', score: mine.complianceRate, severity: mine.complianceRate < 85 ? 'high' : 'low' },
          { label: 'Open Observations', score: mine.openObservations, severity: mine.openObservations > 10 ? 'high' : 'medium' },
          { label: 'Overdue Actions', score: mine.overdueActions, severity: mine.overdueActions > 3 ? 'high' : 'low' },
        ],
        explanation: `Risk assessment based on ${mine.openObservations} open observations and ${mine.overdueActions} overdue actions.`,
        recommendations: [
          'Address high-severity observations first',
          'Complete overdue corrective actions',
          'Schedule follow-up inspection',
        ],
        generatedAt: new Date().toISOString(),
      })),
      recentObservations: mockObservations.slice(0, 5),
      alerts: [],
    };
  },

  getCompliance: async (_mineId?: string): Promise<any> => {
    await delay(400);
    return {
      overall: 94.2,
      byCategory: [
        { category: 'Safety', rate: 96.5 },
        { category: 'Environmental', rate: 91.8 },
        { category: 'Operational', rate: 93.2 },
        { category: 'Health', rate: 89.7 },
      ],
      trend: [
        { date: '2026-04', value: 89 },
        { date: '2026-05', value: 90 },
        { date: '2026-06', value: 91.5 },
        { date: '2026-07', value: 92 },
        { date: '2026-08', value: 93.1 },
        { date: '2026-09', value: 94.2 },
      ],
    };
  },

  getRisk: async (_mineId?: string): Promise<RiskAssessment[]> => {
    await delay(400);
    return mockMines.map(mine => ({
      mineId: mine.id,
      riskScore: mine.riskScore,
      riskLevel: mine.riskScore >= 70 ? 'high' : mine.riskScore >= 40 ? 'medium' : 'low',
      confidence: 0.85,
      factors: [
        { label: 'Safety Compliance', score: mine.complianceRate, severity: mine.complianceRate < 85 ? 'high' : 'low' },
        { label: 'Open Observations', score: mine.openObservations, severity: mine.openObservations > 10 ? 'high' : 'medium' },
        { label: 'Overdue Actions', score: mine.overdueActions, severity: mine.overdueActions > 3 ? 'high' : 'low' },
      ],
      explanation: `Risk assessment for ${mine.name} based on current compliance and operational data.`,
      recommendations: [
        'Address high-severity observations',
        'Complete overdue actions',
        'Schedule follow-up inspection',
      ],
      generatedAt: new Date().toISOString(),
    }));
  },

  getInspections: async (): Promise<any> => {
    await delay(400);
    return {
      total: mockInspections.length,
      completed: mockInspections.filter(i => i.status === 'completed').length,
      scheduled: mockInspections.filter(i => i.status === 'scheduled').length,
      inProgress: mockInspections.filter(i => i.status === 'in_progress').length,
      byType: [
        { type: 'safety', count: mockInspections.filter(i => i.type === 'safety').length },
        { type: 'environmental', count: mockInspections.filter(i => i.type === 'environmental').length },
        { type: 'operational', count: mockInspections.filter(i => i.type === 'operational').length },
        { type: 'statutory', count: mockInspections.filter(i => i.type === 'statutory').length },
      ],
    };
  },
};