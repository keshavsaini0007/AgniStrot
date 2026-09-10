import type { Alert, DashboardSummary, Incident, UserRole } from '@/types';

/**
 * Role-aware adapter for `GET /dashboard/summary`.
 *
 * The backend returns one of four role-shaped payloads; the frontend renders a
 * single unified `DashboardSummary`. This translates each role shape into that
 * unified contract without inventing data — unavailable KPIs stay 0.
 */

export interface MineOfficialDashboardRaw {
  site?: { id: string; name: string; subsidiary: string; expectedWorkers: number } | null;
  openAlerts?: Array<{ id: string; ruleCode: string; severity: Alert['severity']; assignedToName: string; createdAt: string }>;
  todaysInspections?: Array<{ id: string; type: string; inspectorName: string; failedCount: number; capturedAt: string }>;
  inspections7d?: number;
  alerts7d?: number;
  attendanceToday?: { present: number; absent: number };
  pendingWorkflows?: Array<{ alertId: string; state: string; deadline: string; overdue: boolean }>;
}

export interface CorporateDashboardRaw {
  sites?: Array<{ id: string; name: string; subsidiary: string; openAlertsCount: number; criticalAlertsCount: number }>;
  criticalAlerts?: Array<{ id: string; siteName: string; ruleCode: string; severity: string; status: string; createdAt: string }>;
  trend7Day?: { daily: Array<{ date: string; count: number }>; totals: { alerts: number; sites: number } };
  inspections7d?: number;
  incidents7d?: number;
}

export interface RegulatorDashboardRaw {
  sites?: Array<{ id: string; name: string; subsidiary: string; openCriticalCount: number; lastInspectionDate: string | null }>;
  overdueItems?: Array<{ siteId: string; siteName: string; type: string; since: string }>;
}

export interface FieldOfficerDashboardRaw {
  myInspections?: Array<{ id: string; siteId: string; type: string; inspectorName: string; failedCount: number; capturedAt: string }>;
  myIncidents?: Array<{ id: string; siteId: string; severity: Incident['severity']; category: Incident['category']; status: Incident['status']; reportedByName: string; capturedAt: string }>;
}

export type DashboardRaw =
  | MineOfficialDashboardRaw
  | CorporateDashboardRaw
  | RegulatorDashboardRaw
  | FieldOfficerDashboardRaw;

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

// ── Mine official ────────────────────────────────────────────────────────────

const mineOfficial = (raw: MineOfficialDashboardRaw): DashboardSummary => {
  const inspections = raw.todaysInspections ?? [];
  const attendance = raw.attendanceToday ?? { present: 0, absent: 0 };
  const pending = raw.pendingWorkflows ?? [];
  const passed = inspections.filter((i) => i.failedCount === 0).length;
  const complianceRate = inspections.length > 0 ? Math.round((passed / inspections.length) * 100) : 0;

  return {
    role: 'mine_official',
    scopedSiteId: raw.site?.id ?? null,
    message: 'Operational overview for your site',
    stats: {
      inspections7d: raw.inspections7d ?? inspections.length,
      incidents7d: 0,
      attendance7d: num(attendance.present) + num(attendance.absent),
      alerts7d: num(raw.alerts7d),
      complianceRate,
      openIncidents: 0,
      overdueInspections: pending.filter((w) => w.overdue).length,
      upcomingDeadlines: pending.filter((w) => !w.overdue).length,
    },
    recentIncidents: [],
    sites: raw.site
      ? [{ siteId: raw.site.id, name: raw.site.name, openAlerts: (raw.openAlerts ?? []).length }]
      : [],
  };
};

// ── Corporate manager ────────────────────────────────────────────────────────

const corporate = (raw: CorporateDashboardRaw): DashboardSummary => ({
  role: 'corporate_manager',
  scopedSiteId: null,
  message: 'Cross-site compliance overview',
  stats: {
    inspections7d: num(raw.inspections7d),
    incidents7d: num(raw.incidents7d),
    attendance7d: 0,
    alerts7d: num(raw.trend7Day?.totals.alerts),
    complianceRate: 0,
    openIncidents: 0,
    overdueInspections: 0,
    upcomingDeadlines: 0,
  },
  recentIncidents: [],
  sites: (raw.sites ?? []).map((s) => ({
    siteId: s.id,
    name: s.name,
    openAlerts: s.openAlertsCount,
  })),
  trend7Day: (raw.trend7Day?.daily ?? []).map((d) => ({ date: d.date, alerts: d.count })),
});

// ── Regulator ────────────────────────────────────────────────────────────────

const regulator = (raw: RegulatorDashboardRaw): DashboardSummary => ({
  role: 'regulator',
  scopedSiteId: null,
  message: 'Compliance status across all sites',
  stats: {
    inspections7d: 0,
    incidents7d: 0,
    attendance7d: 0,
    alerts7d: 0,
    complianceRate: 0,
    openIncidents: 0,
    overdueInspections: (raw.overdueItems ?? []).length,
    upcomingDeadlines: 0,
  },
  recentIncidents: [],
  sites: (raw.sites ?? []).map((s) => ({
    siteId: s.id,
    name: s.name,
    openAlerts: s.openCriticalCount,
  })),
});

// ── Field officer ────────────────────────────────────────────────────────────

const fieldOfficer = (raw: FieldOfficerDashboardRaw): DashboardSummary => {
  const incidents = raw.myIncidents ?? [];

  return {
    role: 'field_officer',
    scopedSiteId: null,
    message: 'Your recent field activity',
    stats: {
      inspections7d: (raw.myInspections ?? []).length,
      incidents7d: incidents.length,
      attendance7d: 0,
      alerts7d: 0,
      complianceRate: 0,
      openIncidents: incidents.filter((i) => i.status === 'open').length,
      overdueInspections: 0,
      upcomingDeadlines: 0,
    },
    recentIncidents: incidents.map((i): Incident => ({
      id: i.id,
      siteId: i.siteId,
      reportedBy: '',
      severity: i.severity,
      category: i.category,
      description: `${i.category} report`,
      photoUrls: [],
      capturedAt: i.capturedAt,
      status: i.status,
    })),
  };
};

export const toDashboardSummary = (raw: DashboardRaw, role: UserRole): DashboardSummary => {
  switch (role) {
    case 'mine_official':
      return mineOfficial(raw as MineOfficialDashboardRaw);
    case 'corporate_manager':
      return corporate(raw as CorporateDashboardRaw);
    case 'regulator':
      return regulator(raw as RegulatorDashboardRaw);
    case 'field_officer':
      return fieldOfficer(raw as FieldOfficerDashboardRaw);
  }
};