import { useState } from 'react';
import { CalendarDays, LogIn, LogOut, Search, SlidersHorizontal, Users2, MapPin, ChevronRight } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/utils/date';
import type { Attendance } from '@/types';
import type { LucideIcon } from 'lucide-react';

export const AttendancePage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [checkFilter, setCheckFilter] = useState('');
  const { data, isLoading, error, refetch } = useAttendance({
    page,
    limit: 10,
    search: search || undefined,
    checkType: checkFilter || undefined,
  });

  if (error) return <ErrorState onRetry={refetch} />;

  const attendance = data?.data || [];
  const total = data?.meta?.total || attendance.length;
  const ins = attendance.filter((a) => a.checkType === 'in').length;
  const outs = attendance.filter((a) => a.checkType === 'out').length;

  const summary: Array<[string, number, LucideIcon, string]> = [
    ['Check-ins', ins, LogIn, 'text-[#35C759]'],
    ['Check-outs', outs, LogOut, 'text-[#4DA3FF]'],
    ['Total records', total, Users2, 'text-[#D88A32]'],
    ['Sites reporting', new Set(attendance.map((a) => a.siteId)).size, MapPin, 'text-[#F5B942]'],
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-7 sm:px-8 sm:py-9">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.25)_43%,rgba(7,18,28,0.08)_100%)]" />
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D88A32]">Workforce presence / field sync</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8] sm:text-4xl">Attendance</h1>
          <p className="mt-2 max-w-md text-sm text-[#B3C5D0]">Geo-stamped check-in / check-out records captured per worker.</p>
        </div>
        <div className="mt-7 flex flex-wrap gap-5 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />Attendance sync live</span>
        </div>
      </section>

      <section aria-label="Attendance summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map(([label, value, Icon, color]) => (
          <article key={String(label)} className="relative isolate overflow-hidden rounded-xl border border-[#21415A] bg-[#0c1a271f] p-4">
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
                placeholder="Search by worker..."
                leftIcon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </div>
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#6D8795] sm:hidden" />
          </div>
          <Select
            options={[
              { value: '', label: 'All Check Types' },
              { value: 'in', label: 'Check-in' },
              { value: 'out', label: 'Check-out' },
            ]}
            value={checkFilter}
            onChange={(event) => { setCheckFilter(event.target.value); setPage(1); }}
          />
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} columns={6} /></div>
          ) : attendance.length === 0 ? (
            <EmptyState title="No attendance records" description="Records appear once devices sync." />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1.4fr_1.2fr_1fr_1.4fr_0.8fr_32px] gap-4 border-b border-[#1E3545] px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-[#78919F]">
                    <span>Worker</span><span>Site</span><span>Type</span><span>Captured</span><span>Status</span><span />
                  </div>
                  {attendance.map((record) => (
                    <AttendanceRow key={record.id} record={record} />
                  ))}
                </div>
              </div>
              <div className="grid gap-3 p-3 md:hidden">
                {attendance.map((record) => (
                  <AttendanceMobileCard key={record.id} record={record} />
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

const AttendanceRow = ({ record }: { record: Attendance }) => (
  <div className="grid w-full grid-cols-[1.4fr_1.2fr_1fr_1.4fr_0.8fr_32px] items-center gap-4 border-b border-[#1E3545] px-5 py-3 transition-colors hover:bg-[#102435]">
    <p className="text-xs font-semibold text-[#E8F0F3]">{record.workerRef}</p>
    <span className="text-xs text-[#A9BBC4]">{record.siteId}</span>
    <span className="w-fit"><Badge status={record.checkType === 'in' ? 'active' : 'info'} /></span>
    <span className="flex items-center gap-2 text-xs text-[#A9BBC4]">
      <CalendarDays className="h-3.5 w-3.5 text-[#789CB0]" />{formatDateTime(record.capturedAt)}
    </span>
    <span className={`text-xs ${record.syncedAt ? 'text-[#35C759]' : 'text-[#F5B942]'}`}>
      {record.syncedAt ? 'Synced' : 'Pending'}
    </span>
    <ChevronRight className="h-4 w-4 text-[#527084]" />
  </div>
);

const AttendanceMobileCard = ({ record }: { record: Attendance }) => (
  <div className="rounded-xl border border-[#21415A] bg-[#0D1C28] p-3">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-semibold text-[#E8F0F3]">{record.workerRef}</p>
        <p className="mt-1 text-[10px] text-[#A9BBC4]">{record.siteId}</p>
      </div>
      <span className="w-fit"><Badge status={record.checkType === 'in' ? 'active' : 'info'} /></span>
    </div>
    <p className="mt-3 flex items-center gap-1.5 text-[10px] text-[#A9BBC4]">
      <CalendarDays className="h-3 w-3 text-[#789CB0]" />{formatDateTime(record.capturedAt)}
    </p>
  </div>
);