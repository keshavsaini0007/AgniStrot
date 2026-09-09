import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ChevronRight, Search, SlidersHorizontal, TriangleAlert, MapPin, Flame, ShieldAlert, Wrench, CircleEllipsis, Eye } from 'lucide-react';
import { useIncidents } from '@/hooks/useIncidents';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/utils/date';
import type { Incident, IncidentCategory } from '@/types';
import type { LucideIcon } from 'lucide-react';

import incidentsHeroImg from '../../../assets/images/Inspections Header.png';
import totalIncidentsImg from '../../../assets/images/total inspections.png';
import criticalImg from '../../../assets/images/Completed.png';
import openImg from '../../../assets/images/In progress.png';

const categoryTone: Record<IncidentCategory, { icon: LucideIcon; color: string }> = {
  safety: { icon: ShieldAlert, color: 'text-[#FF4D4F]' },
  environmental: { icon: Eye, color: 'text-[#35C759]' },
  equipment: { icon: Wrench, color: 'text-[#4DA3FF]' },
  other: { icon: CircleEllipsis, color: 'text-[#A78BFA]' },
};

export const IncidentsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const { data, isLoading, error, refetch } = useIncidents({
    page,
    limit: 10,
    search: search || undefined,
    type: severityFilter || undefined,
  });

  if (error) return <ErrorState onRetry={refetch} />;

  const incidents = data?.data || [];
  const total = data?.meta?.total || incidents.length;
  const critical = incidents.filter((i) => i.severity === 'critical').length;
  const high = incidents.filter((i) => i.severity === 'high').length;
  const open = incidents.filter((i) => i.status === 'open').length;
  const summary: Array<[string, string | number, LucideIcon, string, string]> = [
    ['Total incidents', total, TriangleAlert, 'text-[#D88A32]', totalIncidentsImg],
    ['Critical', critical, Flame, 'text-[#FF4D4F]', criticalImg],
    ['High severity', high, ShieldAlert, 'text-[#F5B942]', openImg],
    ['Open', open, MapPin, 'text-[#4DA3FF]', openImg],
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-7 sm:px-8 sm:py-9">
        <img src={incidentsHeroImg} alt="Incident reporting" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.25)_43%,rgba(7,18,28,0.08)_100%)]" />
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D88A32]">Field reporting / live registry</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8] sm:text-4xl">Incidents</h1>
          <p className="mt-2 max-w-md text-sm text-[#B3C5D0]">Evidence-backed incident reports synced from the field, triaged by severity.</p>
        </div>
        <div className="mt-7 flex flex-wrap gap-5 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />Incident pipeline live</span>
          <span>{open} open incidents</span>
        </div>
      </section>

      <section aria-label="Incident summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map(([label, value, Icon, color, image]) => (
          <article key={String(label)} className="relative isolate overflow-hidden rounded-xl border border-[#21415A] bg-[#0c1a271f] p-4">
            <img src={image} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-95" />
            <div className="absolute inset-0 -z-10 bg-[#0C1A271f]/45" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] text-[#9FB3BE]">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#F4F7F8]">{value}</p>
              </div>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[#07121C] ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <Card className="overflow-hidden border-[#21415A] bg-[#0a172245]">
        <div className="flex flex-col gap-3 border-b border-[#21415A] p-4 sm:flex-row sm:items-center sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search incidents..."
                leftIcon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </div>
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#6D8795] sm:hidden" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              options={[
                { value: '', label: 'All Severities' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              value={severityFilter}
              onChange={(event) => { setSeverityFilter(event.target.value); setPage(1); }}
            />
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} columns={6} /></div>
          ) : incidents.length === 0 ? (
            <EmptyState title="No incidents found" description="Try adjusting your filters or sync a new report." />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[850px]">
                  <div className="grid grid-cols-[1.35fr_1fr_1fr_1.3fr_1fr_0.8fr_32px] gap-4 border-b border-[#1E3545] px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-[#78919F]">
                    <span>Incident</span><span>Severity</span><span>Category</span><span>Captured</span><span>Site</span><span>Status</span><span />
                  </div>
                  {incidents.map((incident) => (
                    <IncidentRow key={incident.id} incident={incident} navigate={navigate} />
                  ))}
                </div>
              </div>
              <div className="grid gap-3 p-3 md:hidden">
                {incidents.map((incident) => (
                  <IncidentMobileCard key={incident.id} incident={incident} navigate={navigate} />
                ))}
              </div>
              {data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const IncidentRow = ({ incident, navigate }: { incident: Incident; navigate: (path: string) => void }) => {
  const tone = categoryTone[incident.category] ?? categoryTone.other;
  const CatIcon = tone.icon;
  return (
    <button
      type="button"
      onClick={() => navigate(`/app/incidents/${incident.id}`)}
      className="group grid w-full grid-cols-[1.35fr_1fr_1fr_1.3fr_1fr_0.8fr_32px] items-center gap-4 border-b border-[#1E3545] px-5 py-3 text-left transition-colors hover:bg-[#102435]"
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[#E8F0F3]">{incident.id}</p>
        <p className="mt-1 truncate text-[10px] text-[#78919F]">{incident.description}</p>
      </div>
      <span className="w-fit"><Badge status={incident.severity} /></span>
      <div className="flex items-center gap-2 text-xs capitalize text-[#D7E1E5]">
        <CatIcon className={`h-4 w-4 ${tone.color}`} />{incident.category}
      </div>
      <span className="flex items-center gap-2 text-xs text-[#A9BBC4]">
        <CalendarDays className="h-3.5 w-3.5 text-[#789CB0]" />{formatDateTime(incident.capturedAt)}
      </span>
      <span className="text-xs text-[#A9BBC4]">{incident.siteId}</span>
      <span className="w-fit"><Badge status={incident.status.replace('_', '-')} /></span>
      <ChevronRight className="h-4 w-4 text-[#527084] transition-transform group-hover:translate-x-1" />
    </button>
  );
};

const IncidentMobileCard = ({ incident, navigate }: { incident: Incident; navigate: (path: string) => void }) => {
  const tone = categoryTone[incident.category] ?? categoryTone.other;
  const CatIcon = tone.icon;
  return (
    <button
      type="button"
      onClick={() => navigate(`/app/incidents/${incident.id}`)}
      className="group w-full rounded-xl border border-[#21415A] bg-[#0D1C28] p-3 text-left transition-colors hover:bg-[#102435]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#E8F0F3]">{incident.id}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] capitalize text-[#A9BBC4]">
            <CatIcon className={`h-3 w-3 ${tone.color}`} />{incident.category} · {incident.siteId}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="w-fit"><Badge status={incident.severity} /></span>
          <span className="w-fit"><Badge status={incident.status.replace('_', '-')} /></span>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs text-[#A9BBC4]">{incident.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#21415A] pt-3 text-[10px] text-[#78919F]">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3 text-[#789CB0]" />{formatDateTime(incident.capturedAt)}
        </span>
        <span className="flex items-center gap-1 uppercase tracking-[0.14em] text-[#5DB8FF]">
          View <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
};