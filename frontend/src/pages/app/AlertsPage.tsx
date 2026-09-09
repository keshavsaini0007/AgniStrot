import { useState } from 'react';
import { AlarmClock, CheckCheck, Search, SlidersHorizontal, ArrowUp, AlarmClockOff, ShieldAlert, Flame, CircleAlert, Info, ChevronRight, X } from 'lucide-react';
import { useAlerts, useAcknowledgeAlert, useResolveAlert, useEscalateAlert } from '@/hooks/useAlerts';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/utils/date';
import { ALERT_DEADLINE_MS } from '@/types';
import type { Alert, AlertSeverity } from '@/types';
import type { LucideIcon } from 'lucide-react';

const severityIcon: Record<AlertSeverity, { icon: LucideIcon; color: string }> = {
  critical: { icon: Flame, color: 'text-[#FF4058]' },
  high: { icon: CircleAlert, color: 'text-[#FF4D4F]' },
  medium: { icon: ShieldAlert, color: 'text-[#F5B942]' },
  low: { icon: Info, color: 'text-[#4DA3FF]' },
};

const deadlineFor = (alert: Alert): string | null => {
  const ms = ALERT_DEADLINE_MS[alert.severity];
  if (!ms) return null;
  return new Date(new Date(alert.createdAt).getTime() + ms).toISOString();
};

const deadlineLabel = (deadline: string): { text: string; tone: string } => {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return { text: 'Overdue', tone: 'text-[#FF4D4F]' };
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0 && hours < 48) return { text: `${hours}h ${minutes}m left`, tone: 'text-[#F5B942]' };
  if (hours >= 48) return { text: `${hours / 24} days left`, tone: 'text-[#35C759]' };
  return { text: `${minutes}m left`, tone: 'text-[#FF4D4F]' };
};

export const AlertsPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const { data, isLoading, error, refetch } = useAlerts({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
  });

  const acknowledge = useAcknowledgeAlert();
  const resolve = useResolveAlert();
  const escalate = useEscalateAlert();

  const [resolveTarget, setResolveTarget] = useState<Alert | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  if (error) return <ErrorState onRetry={refetch} />;

  const openResolve = (id: string) => {
    const target = alerts.find((a) => a.id === id);
    if (!target) return;
    setResolveNote('');
    setResolveTarget(target);
  };

  const alerts = data?.data || [];
  const total = data?.meta?.total || alerts.length;
  const open = alerts.filter((a) => a.status === 'open').length;
  const escalated = alerts.filter((a) => a.status === 'escalated').length;

  const summary: Array<[string, number, LucideIcon, string]> = [
    ['Total alerts', total, AlarmClock, 'text-[#D88A32]'],
    ['Open', open, ShieldAlert, 'text-[#F5B942]'],
    ['Escalated', escalated, ArrowUp, 'text-[#FF4D4F]'],
    ['Acknowledged', alerts.filter((a) => a.status === 'acknowledged').length, CheckCheck, 'text-[#35C759]'],
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-7 sm:px-8 sm:py-9">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.25)_43%,rgba(7,18,28,0.08)_100%)]" />
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D88A32]">Rule engine / escalation control</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8] sm:text-4xl">Alerts</h1>
          <p className="mt-2 max-w-md text-sm text-[#B3C5D0]">Every detection routed to an owner with a deadline — acknowledge, resolve or escalate.</p>
        </div>
        <div className="mt-7 flex flex-wrap gap-5 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />Rule engine live</span>
          <span>{open} open</span>
          <span>{escalated} escalated</span>
        </div>
      </section>

      <section aria-label="Alert summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                placeholder="Search by rule code..."
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
                { value: '', label: 'All Statuses' },
                { value: 'open', label: 'Open' },
                { value: 'acknowledged', label: 'Acknowledged' },
                { value: 'escalated', label: 'Escalated' },
                { value: 'closed', label: 'Closed' },
              ]}
              value={statusFilter}
              onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            />
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
            <div className="p-6"><TableSkeleton rows={5} columns={7} /></div>
          ) : alerts.length === 0 ? (
            <EmptyState title="No alerts found" description="Try adjusting your filters." />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <div className="min-w-[960px]">
                  <div className="grid grid-cols-[1.5fr_0.9fr_1fr_1fr_1fr_1.3fr_32px] gap-4 border-b border-[#1E3545] px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-[#78919F]">
                    <span>Alert</span><span>Severity</span><span>Rule</span><span>Status</span><span>Deadline</span><span>Actions</span><span />
                  </div>
                  {alerts.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={(id) => acknowledge.mutate({ id })}
                      onResolve={openResolve}
                      onEscalate={(id) => escalate.mutate({ id })}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-3 p-3 lg:hidden">
                {alerts.map((alert) => (
                  <AlertMobileCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={(id) => acknowledge.mutate({ id })}
                    onResolve={openResolve}
                    onEscalate={(id) => escalate.mutate({ id })}
                  />
                ))}
              </div>
              {data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={Boolean(resolveTarget)} onClose={() => setResolveTarget(null)} title="Resolve alert" size="sm">
        {resolveTarget && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#21415A] bg-[#0D1C28] p-3 text-xs text-[#A9BBC4]">
              <p>
                <span className="font-semibold text-[#E8F0F3]">{resolveTarget.id}</span> · {resolveTarget.ruleCode}
              </p>
              <p className="mt-1 text-[10px] text-[#78919F]">
                {resolveTarget.sourceType} · {resolveTarget.siteId} · created {formatRelativeTime(resolveTarget.createdAt)}
              </p>
            </div>
            <Input
              label="Resolution note"
              placeholder="Describe the action taken to close this alert"
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setResolveTarget(null)} leftIcon={<X className="h-4 w-4" />}>
                Cancel
              </Button>
              <Button
                variant="success"
                isLoading={resolve.isPending}
                onClick={() => {
                  resolve.mutate({ id: resolveTarget.id, note: resolveNote || undefined });
                  setResolveTarget(null);
                }}
              >
                Confirm resolve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const AlertActions = ({ alert, onAcknowledge, onResolve, onEscalate }: {
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onEscalate: (id: string) => void;
}) => {
  if (alert.status === 'closed') return null;
  return (
    <div className="flex items-center gap-1.5">
      {alert.status === 'open' && (
        <Button variant="ghost" size="sm" onClick={() => onAcknowledge(alert.id)} leftIcon={<CheckCheck className="h-3.5 w-3.5" />}>
          Acknowledge
        </Button>
      )}
      {(alert.status === 'open' || alert.status === 'acknowledged') && (
        <Button variant="ghost" size="sm" onClick={() => onEscalate(alert.id)} leftIcon={<ArrowUp className="h-3.5 w-3.5 text-[#FF4D4F]" />}>
          Escalate
        </Button>
      )}
      {(alert.status === 'acknowledged' || alert.status === 'escalated') && (
        <Button variant="ghost" size="sm" onClick={() => onResolve(alert.id)} leftIcon={<AlarmClockOff className="h-3.5 w-3.5 text-[#35C759]" />}>
          Resolve
        </Button>
      )}
    </div>
  );
};

const AlertRow = ({ alert, onAcknowledge, onResolve, onEscalate }: {
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onEscalate: (id: string) => void;
}) => {
  const icon = severityIcon[alert.severity] ?? severityIcon.medium;
  const Icon = icon.icon;
  const deadline = deadlineFor(alert);
  const dl = deadline ? deadlineLabel(deadline) : null;
  return (
    <div className="group grid w-full grid-cols-[1.5fr_0.9fr_1fr_1fr_1fr_1.3fr_32px] items-center gap-4 border-b border-[#1E3545] px-5 py-3 transition-colors hover:bg-[#102435]">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs font-semibold text-[#E8F0F3]">
          <Icon className={`h-4 w-4 shrink-0 ${icon.color}`} />
          {alert.id}
        </p>
        <p className="mt-1 text-[10px] text-[#78919F]">{formatRelativeTime(alert.createdAt)} · {alert.sourceType} · {alert.siteId}</p>
      </div>
      <span className="w-fit"><Badge status={alert.severity} /></span>
      <span className="font-mono text-[10px] text-[#A9BBC4]">{alert.ruleCode}</span>
      <span className="w-fit"><Badge status={alert.status} /></span>
      <span className={`text-xs ${dl?.tone ?? ''}`}>{dl?.text ?? '—'}</span>
      <AlertActions alert={alert} onAcknowledge={onAcknowledge} onResolve={onResolve} onEscalate={onEscalate} />
      <ChevronRight className="h-4 w-4 text-[#527084]" />
    </div>
  );
};

const AlertMobileCard = ({ alert, onAcknowledge, onResolve, onEscalate }: {
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onEscalate: (id: string) => void;
}) => {
  const icon = severityIcon[alert.severity] ?? severityIcon.medium;
  const Icon = icon.icon;
  const deadline = deadlineFor(alert);
  const dl = deadline ? deadlineLabel(deadline) : null;
  return (
    <div className="rounded-xl border border-[#21415A] bg-[#0D1C28] p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#E8F0F3]">
          <Icon className={`h-4 w-4 ${icon.color}`} />{alert.id}
        </p>
        <div className="flex gap-1">
          <span className="w-fit"><Badge status={alert.severity} /></span>
          <span className="w-fit"><Badge status={alert.status} /></span>
        </div>
      </div>
      <p className="mt-2 font-mono text-[10px] text-[#A9BBC4]">{alert.ruleCode} · {formatRelativeTime(alert.createdAt)}</p>
      <p className="mt-2 text-[10px] text-[#78919F]">{alert.sourceType} · {alert.siteId}</p>
      <p className={`mt-2 text-xs ${dl?.tone ?? ''}`}>{dl?.text ?? ''}</p>
      <div className="mt-3 border-t border-[#21415A] pt-3">
        <AlertActions alert={alert} onAcknowledge={onAcknowledge} onResolve={onResolve} onEscalate={onEscalate} />
      </div>
    </div>
  );
};