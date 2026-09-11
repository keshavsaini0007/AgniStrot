import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, CircleAlert, MapPin, Plus, Search, ShieldCheck, SlidersHorizontal, Wrench } from 'lucide-react';
import { useMines } from '@/hooks/useMines';
import { DemoBadge } from '@/components/demo/DemoGate';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Mine } from '@/types';
import type { LucideIcon } from 'lucide-react';

import mine001Img from '@/assets/images/Mine-001-clean.png';
import mine002Img from '@/assets/images/Mine-002-clean.png';
import mine003Img from '@/assets/images/Mine-003-clean.png';
import talcherImg from '@/assets/images/Equipment Maintenance Overdue-clean.png';
import raniganjImg from '@/assets/images/Pending Inspections-clean.png';
import recentObservationsImg from '../../../assets/images/Recent Observations.png';
import minesHeroImg from '../../../assets/images/Mines.png';
import totalMinesImg from '../../../assets/images/Total Mines.png';
import activeSiteImg from '../../../assets/images/Active site.png';
import maintenanceImg from '../../../assets/images/Maintenance.png';
import averageComplianceImg from '../../../assets/images/Avg compliance.png';

const mineImages: Record<string, string> = {
  'mine-001': mine001Img,
  'mine-002': mine002Img,
  'mine-003': mine003Img,
  'mine-004': talcherImg,
  'mine-005': raniganjImg,
};

const riskColor = (score: number) => score >= 70 ? 'text-[#FF4D5F]' : score >= 40 ? 'text-[#F5B942]' : 'text-[#35C759]';
const complianceColor = (rate: number) => rate < 85 ? 'text-[#FF4D5F]' : 'text-[#35C759]';

export const MinesPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch } = useMines({
    page,
    limit: 10,
    search,
    status: statusFilter || undefined,
  });

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  const mines = data?.data || [];
  const totalMines = data?.meta?.total || mines.length;
  const activeMines = mines.filter((mine) => mine.status === 'active').length;
  const maintenanceMines = mines.filter((mine) => mine.status === 'maintenance').length;
  const averageCompliance = mines.length ? (mines.reduce((sum, mine) => sum + mine.complianceRate, 0) / mines.length).toFixed(1) : '0.0';
  const summaryMetrics: Array<[string, string | number, LucideIcon, string, string]> = [
    ['Total mines', totalMines, MapPin, 'text-[#4DA3FF]', totalMinesImg],
    ['Active sites', activeMines, ShieldCheck, 'text-[#35C759]', activeSiteImg],
    ['Maintenance', maintenanceMines, Wrench, 'text-[#F5B942]', maintenanceImg],
    ['Avg. compliance', `${averageCompliance}%`, CircleAlert, 'text-[#D88A32]', averageComplianceImg],
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-7 sm:px-8 sm:py-9">
        <img src={minesHeroImg} alt="Coal mine operations" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-100" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.22)_45%,rgba(7,18,28,0.25)_100%)]" />
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div><p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D88A32]">Operations registry / field network</p><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8] sm:text-4xl">Mines</h1><p className="mt-2 max-w-md text-sm text-[#B3C5D0]">Manage and monitor all coal mines from one operational view.</p></div>
          <div className="flex items-center gap-3">
          <DemoBadge />
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Add Mine</Button>
        </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-5 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />Network live</span><span>{activeMines} active sites</span><span>Last synced just now</span></div>
      </section>

      <section aria-label="Mine network summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryMetrics.map(([label, value, Icon, color, image]) => (
          <article key={label} className="relative isolate overflow-hidden rounded-xl border border-[#21415A] bg-[#0C1A27] p-4">
            <img src={image} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-95" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.25)_43%,rgba(7,18,28,0.08)_100%)]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] text-[#c8d3da]">{label}</p>
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
        <div className="flex flex-col gap-3 border-b border-[#21415A] p-4 sm:flex-row sm:items-center sm:px-5"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex-1"><Input placeholder="Search mines..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><SlidersHorizontal className="h-4 w-4 shrink-0 text-[#6D8795] sm:hidden" /></div><div className="flex items-center gap-3"><Select options={[{ value: '', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'maintenance', label: 'Maintenance' }]} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} /><span className="hidden text-[10px] uppercase tracking-[0.16em] text-[#6D8795] lg:block">{totalMines} records</span></div></div>
        <CardContent className="p-0">
          {isLoading ? <div className="p-6"><TableSkeleton rows={5} columns={7} /></div> : mines.length === 0 ? <EmptyState title="No mines found" description="Try adjusting your search or filters." /> : <>
            <div className="hidden overflow-x-auto md:block"><div className="min-w-[850px]"><div className="grid grid-cols-[1.4fr_1.4fr_1.8fr_1fr_0.9fr_0.8fr_32px] gap-4 border-b border-[#1E3545] px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-[#78919F]"><span>Mine identity</span><span>Location</span><span>Status</span><span>Compliance</span><span>Risk score</span><span>Open issues</span><span /></div>{mines.map((mine) => <MineRow key={mine.id} mine={mine} navigate={navigate} />)}</div></div>
            <div className="grid gap-3 p-3 md:hidden">{mines.map((mine) => <MineMobileCard key={mine.id} mine={mine} navigate={navigate} />)}</div>
            {data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />}
          </>}
        </CardContent>
      </Card>
    </div>
  );
};

const MineRow = ({ mine, navigate }: { mine: Mine; navigate: (path: string) => void }) => <button type="button" onClick={() => navigate(`/app/mines/${mine.id}`)} className="group grid w-full grid-cols-[1.4fr_1.4fr_1.8fr_1fr_0.9fr_0.8fr_32px] items-center gap-4 border-b border-[#1E3545] px-5 py-3 text-left transition-colors hover:bg-[#102435]"><div className="flex min-w-0 items-center gap-3"><img src={recentObservationsImg} alt="" className="h-9 w-12 shrink-0 rounded object-cover" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#E8F0F3]">{mine.name}</p><p className="mt-1 text-[10px] font-mono text-[#78919F]">{mine.code}</p></div></div><div className="flex min-w-0 items-center gap-2 text-[11px] text-[#A9BBC4]"><MapPin className="h-3.5 w-3.5 shrink-0 text-[#789CB0]" /><span className="truncate">{mine.location.address}</span></div><div><Badge status={mine.status} /></div><span className={`text-sm font-semibold ${complianceColor(mine.complianceRate)}`}>{mine.complianceRate}%</span><span className={`text-sm font-semibold ${riskColor(mine.riskScore)}`}>{mine.riskScore}</span><span className="text-sm text-[#A9BBC4]">{mine.openObservations}</span><ChevronRight className="h-4 w-4 text-[#527084] transition-transform group-hover:translate-x-1" /></button>;

const MineMobileCard = ({ mine, navigate }: { mine: Mine; navigate: (path: string) => void }) => <button type="button" onClick={() => navigate(`/app/mines/${mine.id}`)} className="group w-full rounded-xl border border-[#21415A] bg-[#0D1C28] p-3 text-left transition-colors hover:bg-[#102435]"><div className="flex items-start gap-3"><img src={mineImages[mine.id]} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate text-sm font-semibold text-[#E8F0F3]">{mine.name}</p><p className="mt-1 text-[10px] font-mono text-[#78919F]">{mine.code}</p></div><Badge status={mine.status} /></div><p className="mt-3 flex items-center gap-1.5 truncate text-[10px] text-[#A9BBC4]"><MapPin className="h-3 w-3 text-[#789CB0]" />{mine.location.address}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#21415A] pt-3"><div><p className="text-[9px] uppercase text-[#78919F]">Compliance</p><p className={`mt-1 text-sm font-semibold ${complianceColor(mine.complianceRate)}`}>{mine.complianceRate}%</p></div><div><p className="text-[9px] uppercase text-[#78919F]">Risk score</p><p className={`mt-1 text-sm font-semibold ${riskColor(mine.riskScore)}`}>{mine.riskScore}</p></div><div><p className="text-[9px] uppercase text-[#78919F]">Open issues</p><p className="mt-1 text-sm font-semibold text-[#A9BBC4]">{mine.openObservations}</p></div></div><div className="mt-3 flex items-center justify-end gap-1 text-[10px] uppercase tracking-[0.14em] text-[#5DB8FF]">View mine <ArrowUpRight className="h-3 w-3" /></div></button>;
