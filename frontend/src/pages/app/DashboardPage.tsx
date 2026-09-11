import { useNavigate } from 'react-router-dom';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ArrowUpRight, ChevronRight, CircleAlert, ClipboardCheck, ShieldCheck, Users2, AlarmClock, Sparkles } from 'lucide-react';
import { formatRelativeTime } from '@/utils/date';
import type { LucideIcon } from 'lucide-react';

import dashboardImg from '../../../assets/images/Dashboard.png';
import incidentsImg from '@/assets/images/Damaged Safety Barricade-clean.png';
import inspectionsImg from '@/assets/images/Pending Inspections-clean.png';
import alertsImg from '@/assets/images/AI Risk Intelligence-clean.png';
import attendanceImg from '@/assets/images/Mine-001-clean.png';
import complianceImg from '@/assets/images/Overdue Actions-clean.png';

type StatsKey =
  | 'inspections7d'
  | 'incidents7d'
  | 'attendance7d'
  | 'alerts7d'
  | 'complianceRate'
  | 'openIncidents'
  | 'overdueInspections'
  | 'upcomingDeadlines';

const kpiVisuals: Array<{
  key: StatsKey;
  label: string;
  icon: LucideIcon;
  color: string;
  img: string;
  suffix?: string;
}> = [
  { key: 'openIncidents', label: 'Open Incidents', icon: CircleAlert, color: 'text-[#FF4D5F]', img: incidentsImg },
  { key: 'inspections7d', label: 'Inspections (7d)', icon: ClipboardCheck, color: 'text-[#4DA3FF]', img: inspectionsImg },
  { key: 'alerts7d', label: 'Alerts (7d)', icon: AlarmClock, color: 'text-[#F5B942]', img: alertsImg },
  { key: 'attendance7d', label: 'Attendance (today)', icon: Users2, color: 'text-[#35C759]', img: attendanceImg },
  { key: 'complianceRate', label: 'Compliance Rate', icon: ShieldCheck, color: 'text-[#35C759]', img: complianceImg, suffix: '%' },
];

export const DashboardPage = () => {
  const { data, isLoading, error, refetch } = useDashboardSummary();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} />)}</div>;
  }

  if (error) return <ErrorState onRetry={refetch} />;
  if (!data) return null;

  const stats = data.stats ?? {};

  return (
    <div className="space-y-5 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-6 sm:px-8 sm:py-8">
        <img src={dashboardImg} alt="Mine operations" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_5%,rgba(7,18,28,0.05)_42%,rgba(7,18,28,0.06)_100%)]" />
        <div className="relative max-w-2xl">
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#5DB8FF]">Operations control / live overview</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8] sm:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-md text-sm text-[#B3C5D0]">
            {data.message ?? 'Overview of field inspections, incidents, attendance and alerts.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />System live</span>
            <span className="text-[#557486]">{data.scopedSiteId ? `Scoped to ${data.scopedSiteId}` : 'All sites'}</span>
          </div>
        </div>
      </section>

      <section aria-label="Key operational metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpiVisuals.map(({ key, label, icon: Icon, color, img, suffix }) => (
          <article key={key} className="relative isolate min-h-[116px] overflow-hidden rounded-xl border border-[#21415A] bg-[#0C1A27] p-4">
            <img src={img} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-95" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.25)_43%,rgba(7,18,28,0.08)_100%)]" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] text-[#A5BAC7]">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#F4F7F8]">
                  {stats[key] ?? 0}{suffix ?? ''}
                </p>
              </div>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[#07121C]/80 ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden border-[#21415A] bg-[#0a172245]">
          <div className="flex items-center justify-between border-b border-[#21415A] px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-[#F4F7F8]">Recent Incidents</h2>
              <p className="mt-1 text-[10px] text-[#8299A7]">Latest field reports across accessible sites</p>
            </div>
            <button
              onClick={() => navigate('/app/incidents')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-[#5DB8FF]"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <CardContent className="p-0 divide-y divide-[#1E3545]">
            {(data.recentIncidents ?? []).length === 0 && (
              <p className="p-5 text-sm text-[#8299A7]">No recent incidents.</p>
            )}
            {(data.recentIncidents ?? []).map((incident) => (
              <button
                key={incident.id}
                type="button"
                onClick={() => navigate(`/app/incidents/${incident.id}`)}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#102435] sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#E8F0F3]">{incident.id}</p>
                  <p className="mt-1 truncate text-[10px] text-[#8299A7]">{incident.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge status={incident.severity} />
                  <span className="hidden text-[10px] text-[#718B9A] sm:block">{formatRelativeTime(incident.capturedAt)}</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#527084] transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-[#21415A] bg-[#0a172245]">
          <div className="flex items-center justify-between border-b border-[#21415A] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#4DA3FF]" />
              <h2 className="text-base font-semibold text-[#F4F7F8]">Site Risk Overview</h2>
            </div>
            <button
              onClick={() => navigate('/app/analytics')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-[#5DB8FF]"
            >
              Open <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <CardContent className="p-0 divide-y divide-[#1E3545]">
            {(data.sites ?? []).length === 0 && (
              <p className="p-5 text-sm text-[#8299A7]">No site risk data available.</p>
            )}
            {(data.sites ?? []).map((site) => (
              <div key={site.siteId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#E8F0F3]">{site.name}</p>
                  <p className="mt-1 text-[10px] text-[#8299A7]">{site.siteId}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[10px] text-[#8299A7]">
                    <CircleAlert className="h-3 w-3 text-[#F5B942]" />{site.openAlerts ?? 0} alerts
                  </span>
                  {typeof site.riskScore === 'number' && (
                    <Badge status={site.riskScore >= 70 ? 'high' : site.riskScore >= 40 ? 'medium' : 'active'} />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};