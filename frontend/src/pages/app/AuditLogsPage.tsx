import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDateTime } from '@/utils/date';
import type { AuditLog } from '@/types';
import auditLogsHeaderImg from '../../../assets/images/Notifications.png';

export const AuditLogsPage = () => {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const { data, isLoading, error, refetch } = useAuditLogs({
    page,
    limit: 10,
    search: query || undefined,
  });

  if (error) return <ErrorState onRetry={refetch} />;

  const logs = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Append-only, hash-chained compliance trail"
        backgroundImage={auditLogsHeaderImg}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-[#21415A] p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search by action or entity id..."
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            />
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} columns={6} /></div>
          ) : logs.length === 0 ? (
            <EmptyState title="No audit entries" description="Adjust your search or check access permissions." />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[1.2fr_1fr_1.3fr_1fr_1.4fr_0.8fr] gap-4 border-b border-[#1E3545] px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-[#78919F]">
                  <span>ID</span><span>Action</span><span>Entity</span><span>Actor</span><span>Timestamp</span><span>Chain</span>
                </div>
                {logs.map((log) => (
                  <AuditRow key={log.id} log={log} />
                ))}
              </div>
            </div>
          )}
          {data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />}
        </CardContent>
      </Card>
    </div>
  );
};

const AuditRow = ({ log }: { log: AuditLog }) => (
  <div className="grid grid-cols-[1.2fr_1fr_1.3fr_1fr_1.4fr_0.8fr] items-center gap-4 border-b border-[#1E3545] px-5 py-3 transition-colors hover:bg-[#102435]">
    <span className="font-mono text-xs text-[#A4ADB2]">{log.id}</span>
    <span className="text-xs capitalize text-[#E8F0F3]">{log.action.replace('_', ' ')}</span>
    <div className="min-w-0">
      <p className="truncate font-mono text-xs text-[#A4ADB2]">{log.entityId}</p>
      <p className="text-[10px] capitalize text-[#78919F]">{log.entityType.replace('_', ' ')}</p>
    </div>
    <span className="font-mono text-xs text-[#A4ADB2]">{log.actorId ?? 'system'}</span>
    <span className="text-xs text-[#A4ADB2]">{formatDateTime(log.createdAt)}</span>
    <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-[#35C759]">
      <ShieldCheck className="h-3.5 w-3.5" /> Intact
    </span>
  </div>
);