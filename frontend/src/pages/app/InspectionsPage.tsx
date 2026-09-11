import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ChevronRight, ClipboardCheck, Eye, Leaf, Search, Shield, SlidersHorizontal, Wrench, Users } from 'lucide-react';
import { useInspections } from '@/hooks/useInspections';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/utils/date';
import type { Inspection, InspectionType } from '@/types';
import type { LucideIcon } from 'lucide-react';

import inspectionsHeroImg from '../../../assets/images/Inspections Header.png';
import totalInspectionsImg from '@/assets/images/Pending Inspections-clean.png';
import failuresImg from '@/assets/images/Structural Weakness in Support Beam-clean.png';
import thisWeekImg from '@/assets/images/Mine-002-clean.png';
import avgFailedImg from '@/assets/images/Dust Emission Near Processing Plant-clean.png';

const typeTone: Record<InspectionType, { icon: LucideIcon; color: string }> = {
  safety: { icon: Shield, color: 'text-[#D88A32]' },
  environmental: { icon: Leaf, color: 'text-[#35C759]' },
  production: { icon: Wrench, color: 'text-[#4DA3FF]' },
  labour: { icon: Users, color: 'text-[#A78BFA]' },
};

export const InspectionsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { data, isLoading, error, refetch } = useInspections({
    page,
    limit: 10,
    search: search || undefined,
    type: typeFilter || undefined,
  });

  const stats = useMemo(() => {
    const inspections = data?.data ?? [];
    const failures = inspections.filter((i) => (i.failedCount ?? 0) > 0).length;
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = inspections.filter((i) => new Date(i.capturedAt).getTime() > weekStart).length;
    const avgFailed =
      inspections.length > 0
        ? (inspections.reduce((sum, i) => sum + (i.failedCount ?? 0), 0) / inspections.length).toFixed(1)
        : '0';
    return { total: data?.meta?.total ?? inspections.length, failures, thisWeek, avgFailed };
  }, [data]);

  if (error) return <ErrorState onRetry={refetch} />;

  const inspections = data?.data || [];
  const summary: Array<[string, string | number, LucideIcon, string, string]> = [
    ['Total inspections', stats.total, ClipboardCheck, 'text-[#D88A32]', totalInspectionsImg],
    ['Checklist failures', stats.failures, Eye, 'text-[#FF4D4F]', failuresImg],
    ['This week', stats.thisWeek, CalendarDays, 'text-[#35C759]', thisWeekImg],
    ['Avg failed items', stats.avgFailed, ClipboardCheck, 'text-[#4DA3FF]', avgFailedImg],
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-7 sm:px-8 sm:py-9">
        <img src={inspectionsHeroImg} alt="Mine inspection operations" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.25)_43%,rgba(7,18,28,0.08)_100%)]" />
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D88A32]">Field assurance / live registry</p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8] sm:text-4xl">Inspections</h1>
            <p className="mt-2 max-w-md text-sm text-[#B3C5D0]">Checklist-based field inspections captured offline and synced to the platform.</p>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-5 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />Sync pipeline live</span>
          <span>{stats.failures} inspections with failures</span>
          <span>Captured via field app</span>
        </div>
      </section>

      <section aria-label="Inspection summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map(([label, value, Icon, color, image]) => (
          <article key={String(label)} className="relative isolate overflow-hidden rounded-xl border border-[#21415A] bg-[#0c1a271f] p-4">
            <img src={image} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-95" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.25)_43%,rgba(7,18,28,0.08)_100%)]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] text-[#c8d3da]">{label}</p>
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
                placeholder="Search inspections..."
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
                { value: '', label: 'All Types' },
                { value: 'safety', label: 'Safety' },
                { value: 'environmental', label: 'Environmental' },
                { value: 'production', label: 'Production' },
                { value: 'labour', label: 'Labour' },
              ]}
              value={typeFilter}
              onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }}
            />
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} columns={6} /></div>
          ) : inspections.length === 0 ? (
            <EmptyState title="No inspections found" description="Try adjusting your filters or sync a new capture." />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[850px]">
                  <div className="grid grid-cols-[1.2fr_1fr_1fr_1.3fr_1fr_0.8fr_32px] gap-4 border-b border-[#1E3545] px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-[#78919F]">
                    <span>Inspection</span><span>Type</span><span>Site</span><span>Captured</span><span>Failures</span><span>Sync</span><span />
                  </div>
                  {inspections.map((inspection) => (
                    <InspectionRow key={inspection.id} inspection={inspection} navigate={navigate} />
                  ))}
                </div>
              </div>
              <div className="grid gap-3 p-3 md:hidden">
                {inspections.map((inspection) => (
                  <InspectionMobileCard key={inspection.id} inspection={inspection} navigate={navigate} />
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

const InspectionRow = ({ inspection, navigate }: { inspection: Inspection; navigate: (path: string) => void }) => {
  const tone = typeTone[inspection.type] ?? typeTone.safety;
  const TypeIcon = tone.icon;
  const failures = inspection.failedCount ?? 0;
  return (
    <button
      type="button"
      onClick={() => navigate(`/app/inspections/${inspection.id}`)}
      className="group grid w-full grid-cols-[1.2fr_1fr_1fr_1.3fr_1fr_0.8fr_32px] items-center gap-4 border-b border-[#1E3545] px-5 py-3 text-left transition-colors hover:bg-[#102435]"
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[#E8F0F3]">{inspection.id}</p>
        <p className="mt-1 text-[10px] text-[#78919F]">Inspector {inspection.inspectorId}</p>
      </div>
      <div className="flex items-center gap-2 text-xs capitalize text-[#D7E1E5]">
        <TypeIcon className={`h-4 w-4 ${tone.color}`} />
        {inspection.type}
      </div>
      <span className="text-xs text-[#A9BBC4]">{inspection.siteId}</span>
      <span className="flex items-center gap-2 text-xs text-[#A9BBC4]">
        <CalendarDays className="h-3.5 w-3.5 text-[#789CB0]" />
        {formatDateTime(inspection.capturedAt)}
      </span>
      <span className="w-fit">
        <Badge status={failures > 0 ? 'high' : 'active'} />
      </span>
      <span className={`text-xs ${inspection.syncedAt ? 'text-[#35C759]' : 'text-[#F5B942]'}`}>
        {inspection.syncedAt ? 'Synced' : 'Pending'}
      </span>
      <ChevronRight className="h-4 w-4 text-[#527084] transition-transform group-hover:translate-x-1" />
    </button>
  );
};

const InspectionMobileCard = ({ inspection, navigate }: { inspection: Inspection; navigate: (path: string) => void }) => {
  const tone = typeTone[inspection.type] ?? typeTone.safety;
  const TypeIcon = tone.icon;
  const failures = inspection.failedCount ?? 0;
  return (
    <button
      type="button"
      onClick={() => navigate(`/app/inspections/${inspection.id}`)}
      className="group w-full rounded-xl border border-[#21415A] bg-[#0D1C28] p-3 text-left transition-colors hover:bg-[#102435]"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#E8F0F3]">{inspection.id}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] capitalize text-[#A9BBC4]">
                <TypeIcon className={`h-3 w-3 ${tone.color}`} />{inspection.type} · {inspection.siteId}
              </p>
            </div>
            <span className="w-fit"><Badge status={failures > 0 ? 'high' : 'active'} /></span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-[#A9BBC4]">
            <CalendarDays className="h-3 w-3 text-[#789CB0]" />{formatDateTime(inspection.capturedAt)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[#21415A] pt-3 text-[10px] text-[#78919F]">
        <span>{failures} failed checklist {failures === 1 ? 'item' : 'items'}</span>
        <span className="flex items-center gap-1 uppercase tracking-[0.14em] text-[#5DB8FF]">
          View inspection <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
};