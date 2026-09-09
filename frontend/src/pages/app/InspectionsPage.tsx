import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ChevronRight, ClipboardCheck, Eye, Leaf, Plus, Search, Shield, SlidersHorizontal, Wrench } from 'lucide-react';
import { useInspections } from '@/hooks/useInspections';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/utils/date';
import type { Inspection } from '@/types';
import type { LucideIcon } from 'lucide-react';

import inspectionsHeroImg from '../../../assets/images/Inspections Header.png';
import totalInspectionsImg from '../../../assets/images/total inspections.png';
import completedImg from '../../../assets/images/Completed.png';
import scheduledImg from '../../../assets/images/Scheduled.png';
import inProgressImg from '../../../assets/images/In progress.png';
import mine001Img from '@/assets/images/Mine-001-clean.png';
import mine002Img from '@/assets/images/Mine-002-clean.png';
import mine003Img from '@/assets/images/Mine-003-clean.png';
import equipmentImg from '@/assets/images/Equipment Maintenance Overdue-clean.png';
import dustImg from '@/assets/images/Dust Emission Near Processing Plant-clean.png';

const inspectionImages: Record<string, string> = {
  'mine-001': mine001Img,
  'mine-002': mine002Img,
  'mine-003': mine003Img,
  'mine-005': equipmentImg,
};

const typeTone = (type: Inspection['type']) => ({
  safety: { icon: Shield, color: 'text-[#D88A32]' },
  environmental: { icon: Leaf, color: 'text-[#35C759]' },
  operational: { icon: Wrench, color: 'text-[#4DA3FF]' },
  statutory: { icon: ClipboardCheck, color: 'text-[#A78BFA]' },
}[type]);

const typeImage = (inspection: Inspection) => inspection.type === 'environmental' ? dustImg : inspectionImages[inspection.mineId];

export const InspectionsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { data, isLoading, error, refetch } = useInspections({ page, limit: 10, search: search || undefined, status: statusFilter || undefined, type: typeFilter || undefined });

  if (error) return <ErrorState onRetry={refetch} />;

  const inspections = data?.data || [];
  const totalInspections = data?.meta?.total || inspections.length;
  const completed = inspections.filter((inspection) => inspection.status === 'completed').length;
  const scheduled = inspections.filter((inspection) => inspection.status === 'scheduled').length;
  const inProgress = inspections.filter((inspection) => inspection.status === 'in_progress').length;
  const summary: Array<[string, string | number, LucideIcon, string, string]> = [
    ['Total inspections', totalInspections, ClipboardCheck, 'text-[#D88A32]', totalInspectionsImg],
    ['Completed', completed, ClipboardCheck, 'text-[#35C759]', completedImg],
    ['Scheduled', scheduled, CalendarDays, 'text-[#4DA3FF]', scheduledImg],
    ['In progress', inProgress, Wrench, 'text-[#F5B942]', inProgressImg],
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-7 sm:px-8 sm:py-9">
        <img src={inspectionsHeroImg} alt="Mine inspection operations" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.84)_43%,rgba(7,18,28,0.2)_100%)]" />
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D88A32]">Field assurance / live registry</p><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8] sm:text-4xl">Inspections</h1><p className="mt-2 max-w-md text-sm text-[#B3C5D0]">Manage and track mine inspections from schedule to verified field evidence.</p></div><Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>New Inspection</Button></div>
        <div className="mt-7 flex flex-wrap gap-5 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />Inspection system live</span><span>{completed} completed reviews</span><span>Last synced just now</span></div>
      </section>

      <section aria-label="Inspection summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{summary.map(([label, value, Icon, color, image]) => <article key={String(label)} className="relative isolate overflow-hidden rounded-xl border border-[#21415A] bg-[#0c1a271f] p-4"><img src={image} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-95" /><div className="absolute inset-0 -z-10 bg-[#0C1A271f]/45" /><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] text-[#9FB3BE]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#F4F7F8]">{value}</p></div><span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[#07121C] ${color}`}><Icon className="h-4 w-4" /></span></div></article>)}</section>

      <Card className="overflow-hidden border-[#21415A] bg-[#0a172245]"><div className="flex flex-col gap-3 border-b border-[#21415A] p-4 sm:flex-row sm:items-center sm:px-5"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex-1"><Input placeholder="Search inspections..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><SlidersHorizontal className="h-4 w-4 shrink-0 text-[#6D8795] sm:hidden" /></div><div className="flex flex-col gap-3 sm:flex-row"><Select options={[{ value: '', label: 'All Statuses' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} /><Select options={[{ value: '', label: 'All Types' }, { value: 'safety', label: 'Safety' }, { value: 'environmental', label: 'Environmental' }, { value: 'operational', label: 'Operational' }, { value: 'statutory', label: 'Statutory' }]} value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} /></div></div>
        <CardContent className="p-0">{isLoading ? <div className="p-6"><TableSkeleton rows={5} columns={6} /></div> : inspections.length === 0 ? <EmptyState title="No inspections found" description="Try adjusting your filters or create a new inspection." /> : <><div className="hidden overflow-x-auto md:block"><div className="min-w-[850px]"><div className="grid grid-cols-[1.35fr_1.1fr_1fr_1.35fr_1fr_0.8fr_32px] gap-4 border-b border-[#1E3545] px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-[#78919F]"><span>Inspection</span><span>Type</span><span>Mine</span><span>Scheduled</span><span>Status</span><span>Observations</span><span /></div>{inspections.map((inspection) => <InspectionRow key={inspection.id} inspection={inspection} navigate={navigate} />)}</div></div><div className="grid gap-3 p-3 md:hidden">{inspections.map((inspection) => <InspectionMobileCard key={inspection.id} inspection={inspection} navigate={navigate} />)}</div>{data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />}</>}</CardContent>
      </Card>
    </div>
  );
};

const InspectionRow = ({ inspection, navigate }: { inspection: Inspection; navigate: (path: string) => void }) => { const tone = typeTone(inspection.type); const TypeIcon = tone.icon; return <button type="button" onClick={() => navigate(`/app/inspections/${inspection.id}`)} className="group grid w-full grid-cols-[1.35fr_1.1fr_1fr_1.35fr_1fr_0.8fr_32px] items-center gap-4 border-b border-[#1E3545] px-5 py-3 text-left transition-colors hover:bg-[#102435]"><div className="flex min-w-0 items-center gap-3"><img src={typeImage(inspection)} alt="" className="h-11 w-14 shrink-0 rounded-md object-cover" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#E8F0F3]">{inspection.id}</p><p className="mt-1 text-[10px] text-[#78919F]">Inspector {inspection.inspectorId}</p></div></div><div className="flex items-center gap-2 text-xs capitalize text-[#D7E1E5]"><TypeIcon className={`h-4 w-4 ${tone.color}`} />{inspection.type}</div><span className="text-xs text-[#A9BBC4]">{inspection.mineId}</span><span className="flex items-center gap-2 text-xs text-[#A9BBC4]"><CalendarDays className="h-3.5 w-3.5 text-[#789CB0]" />{formatDate(inspection.scheduledAt)}</span><span className="w-fit"><Badge status={inspection.status} /></span><span className="flex items-center gap-2 text-xs text-[#A9BBC4]"><Eye className="h-3.5 w-3.5 text-[#789CB0]" />{inspection.observationsCount}</span><ChevronRight className="h-4 w-4 text-[#527084] transition-transform group-hover:translate-x-1" /></button>; };

const InspectionMobileCard = ({ inspection, navigate }: { inspection: Inspection; navigate: (path: string) => void }) => { const tone = typeTone(inspection.type); const TypeIcon = tone.icon; return <button type="button" onClick={() => navigate(`/app/inspections/${inspection.id}`)} className="group w-full rounded-xl border border-[#21415A] bg-[#0D1C28] p-3 text-left transition-colors hover:bg-[#102435]"><div className="flex items-start gap-3"><img src={typeImage(inspection)} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-[#E8F0F3]">{inspection.id}</p><p className="mt-1 flex items-center gap-1.5 text-[10px] capitalize text-[#A9BBC4]"><TypeIcon className={`h-3 w-3 ${tone.color}`} />{inspection.type} · {inspection.mineId}</p></div><span className="w-fit"><Badge status={inspection.status} /></span></div><p className="mt-3 flex items-center gap-1.5 text-[10px] text-[#A9BBC4]"><CalendarDays className="h-3 w-3 text-[#789CB0]" />{formatDate(inspection.scheduledAt)}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-[#21415A] pt-3 text-[10px] text-[#78919F]"><span>{inspection.observationsCount} observations recorded</span><span className="flex items-center gap-1 uppercase tracking-[0.14em] text-[#5DB8FF]">View inspection <ArrowUpRight className="h-3 w-3" /></span></div></button>; };
