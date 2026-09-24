import { useState } from 'react';
import {
  Plus,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Hammer,
  Lock,
  Target,
} from 'lucide-react';
import {
  useHazards,
  useHazardDashboard,
  useRegisterHazard,
  useAddHazardControl,
  useImplementHazardControl,
  useAssessHazardEffectiveness,
  useCloseHazard,
} from '@/hooks/useHazards';
import { useAuth } from '@/hooks/useAuth';
import { useMines } from '@/hooks/useMines';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { FilterBar } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/utils/date';
import type {
  Hazard,
  HazardControlType,
  HazardDashboard,
  HazardListParams,
  RegisterHazardInput,
} from '@/types';

// ── Feature 06: Hazard Register dashboard ────────────────────────────────────
// Deterministic risk register: likelihood × consequence drives the 5×5 matrix
// server-side, then the hierarchy-of-controls engine derives effectiveness.
// Lifecycle: open → mitigating (first control implemented) → controlled
// (effectiveness == effective) → closed (only from controlled). Closed hazards
// are immutable — the UI hides all write affordances once a hazard is closed.

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'mitigating', label: 'Mitigating' },
  { value: 'controlled', label: 'Controlled' },
  { value: 'closed', label: 'Closed' },
];

const RISK_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const CONTROL_TYPE_OPTIONS = [
  { value: 'elimination', label: 'Elimination (tier 5 — removes the driver)' },
  { value: 'substitution', label: 'Substitution (tier 4 — replaces the hazard source)' },
  { value: 'engineering', label: 'Engineering (tier 3 — guards / barriers)' },
  { value: 'administrative', label: 'Administrative (tier 2 — procedures / rosters)' },
  { value: 'ppe', label: 'PPE (tier 1 — personal protection)' },
];

const CONTROL_TYPE_LABEL: Record<HazardControlType, string> = {
  elimination: 'Elimination · tier 5',
  substitution: 'Substitution · tier 4',
  engineering: 'Engineering · tier 3',
  administrative: 'Administrative · tier 2',
  ppe: 'PPE · tier 1',
};

const FACTOR_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));

const MetricCard = ({
  label,
  value,
  color,
  icon: Icon,
  testId,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  testId?: string;
}) => (
  <article className="rounded-xl border border-[#21415A] bg-[#0C1A27] p-4">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-[13px] text-[#A5BAC7]">{label}</p>
        <p data-testid={testId} className="mt-1 text-2xl font-semibold text-[#F4F7F8]">{value}</p>
      </div>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#07121C]/80 ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
  </article>
);

export const HazardPage = () => {
  const { user, can } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState<'' | Hazard['riskLevel']>('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params: HazardListParams = {
    page,
    limit: 10,
    ...(status ? { status } : {}),
    ...(riskLevel ? { riskLevel } : {}),
  };
  const { data, isLoading, error, refetch } = useHazards(params);
  const dashboard = useHazardDashboard();

  if (error) return <ErrorState onRetry={refetch} />;

  const rows: Hazard[] = data?.data ?? [];
  const dash: HazardDashboard | undefined = dashboard.data?.data;
  const selected: Hazard | undefined = rows.find((r) => r.id === selectedId);
  const canWrite = can('hazards', 'write');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hazard Register"
        subtitle="Deterministic risk register — the 5×5 matrix (likelihood × consequence) and the hierarchy-of-controls effectiveness engine run server-side. Track each hazard from open to controlled to closed."
        action={
          canWrite ? (
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setRegisterOpen(true)}
            >
              Register hazard
            </Button>
          ) : undefined
        }
      />

      {/* Register counters */}
      <section aria-label="Hazard register counters" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <MetricCard label="Total" value={dash?.total ?? 0} color="text-[#5DB8FF]" icon={ShieldAlert} testId="stat-total" />
        <MetricCard label="Open" value={dash?.open ?? 0} color="text-[#B9A0FF]" icon={Clock} testId="stat-open" />
        <MetricCard label="Mitigating" value={dash?.mitigating ?? 0} color="text-[#F5A623]" icon={Hammer} testId="stat-mitigating" />
        <MetricCard label="Controlled" value={dash?.controlled ?? 0} color="text-[#35C759]" icon={CheckCircle2} testId="stat-controlled" />
        <MetricCard label="Closed" value={dash?.closed ?? 0} color="text-[#8D969B]" icon={Lock} testId="stat-closed" />
        <MetricCard label="High risk" value={dash?.high ?? 0} color="text-[#FF9F43]" icon={AlertTriangle} testId="stat-high" />
        <MetricCard label="Critical" value={dash?.critical ?? 0} color="text-[#FF4D4F]" icon={AlertTriangle} testId="stat-critical" />
      </section>

      {/* List */}
      <Card>
        <div className="flex flex-col gap-3 border-b border-[#21415A] p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#F4F7F8]">Register</h2>
            <p className="mt-1 text-[13px] text-[#8299A7]">
              {canWrite
                ? 'Corporate & mine officials can register hazards, add and implement controls, assess effectiveness, and close controlled hazards.'
                : user?.role === 'regulator'
                  ? 'Read-only oversight — every register entry is visible across sites.'
                  : 'View-only.'}
            </p>
          </div>
          <FilterBar>
            <Select
              compact
              placeholder="All statuses"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="sm:w-44"
            />
            <Select
              compact
              placeholder="All risk levels"
              options={RISK_OPTIONS}
              value={riskLevel}
              onChange={(event) => {
                setRiskLevel(event.target.value as Hazard['riskLevel']);
                setPage(1);
              }}
              className="sm:w-40"
            />
          </FilterBar>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} columns={7} /></div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No hazards registered"
              description="No hazards match this filter. Register the first one to start the control lifecycle."
            />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1100px]">
                <div className="grid grid-cols-[2fr_1fr_1fr_0.9fr_0.8fr_1.1fr_0.6fr] gap-4 border-b border-[#1E3545] px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-[#78919F]">
                  <span>Hazard</span><span>Site</span><span>Inherent risk</span><span>Status</span><span>Controls</span><span>Effectiveness</span><span>Action</span>
                </div>
                {rows.map((row) => (
                  <HazardRow
                    key={row.id}
                    row={row}
                    onManage={() => setSelectedId(row.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />}
        </CardContent>
      </Card>

      {/* Register modal */}
      <RegisterHazardModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        defaultSiteId={user?.siteId ?? undefined}
      />

      {/* Manage modal */}
      <ManageHazardModal
        hazard={selected ?? null}
        onClose={() => setSelectedId(null)}
        canWrite={canWrite}
      />
    </div>
  );
};

// ── Row ──────────────────────────────────────────────────────────────────────

const HazardRow = ({ row, onManage }: { row: Hazard; onManage: () => void }) => {
  const implemented = row.controls.filter((c) => c.implemented).length;
  return (
    <div
      data-testid="hazard-row"
      className="grid grid-cols-[2fr_1fr_1fr_0.9fr_0.8fr_1.1fr_0.6fr] items-center gap-4 border-b border-[#1E3545] px-5 py-3 transition-colors hover:bg-[#102435]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#07121C]/80 text-[#F5A623]">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[#E8F0F3]">{row.title}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#78919F]">
              {row.category}
              {row.sourceType === 'alert' && (
                <span className="rounded bg-[#B9A0FF]/15 px-1 py-px text-[9px] text-[#B9A0FF]">from alert</span>
              )}
              {row.sourceType === 'ocr' && (
                <span className="rounded bg-[#35C759]/15 px-1 py-px text-[9px] text-[#35C759]">from OCR scan</span>
              )}
            </p>
          </div>
        </div>
      </div>
      <span className="truncate text-xs text-[#A4ADB2]">{row.siteName ?? row.siteId}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-[#A4ADB2]">{row.riskScore}</span>
        <Badge status={row.riskLevel} />
      </div>
      <div><Badge status={row.status} /></div>
      <span className="text-xs text-[#A4ADB2]">{implemented}/{row.controls.length}</span>
      <div className="min-w-0">
        {row.effectiveness ? (
          <>
            <Badge status={row.effectiveness.status} />
            {row.effectiveness.recurrenceOverride && (
              <p className="mt-0.5 text-[10px] text-[#FF4D4F]">recurrence override</p>
            )}
          </>
        ) : (
          <span className="text-xs text-[#78919F]">— not assessed —</span>
        )}
      </div>
      <div>
        <Button size="sm" variant="secondary" onClick={onManage}>
          Manage
        </Button>
      </div>
    </div>
  );
};

// ── Register hazard modal ────────────────────────────────────────────────────

const RegisterHazardModal = ({
  open,
  onClose,
  defaultSiteId,
}: {
  open: boolean;
  onClose: () => void;
  defaultSiteId?: string;
}) => {
  const { data: mines } = useMines({ page: 1, limit: 100 });
  const registerMutation = useRegisterHazard();
  const siteOptions = (mines?.data ?? []).map((m) => ({ value: m.id, label: m.name }));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [likelihood, setLikelihood] = useState('3');
  const [consequence, setConsequence] = useState('3');
  const [siteId, setSiteId] = useState(defaultSiteId ?? '');

  const reset = () => {
    setTitle('');
    setDescription('');
    setLikelihood('3');
    setConsequence('3');
  };

  const resolvedSite = siteId || defaultSiteId || siteOptions[0]?.value || '';

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !resolvedSite) return;
    const input: RegisterHazardInput = {
      siteId: resolvedSite,
      title: title.trim(),
      description: description.trim(),
      likelihood: Number(likelihood),
      consequence: Number(consequence),
    };
    try {
      await registerMutation.mutateAsync(input);
      reset();
      onClose();
    } catch {
      // error surfaced below
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Register hazard"
      size="md"
    >
      <div className="space-y-4" data-testid="hazard-register-modal">
        <p className="text-[12px] leading-relaxed text-[#8299A7]">
          Supply the drivers only — the risk matrix (likelihood × consequence)
          and the category are computed server-side. Proposed controls are
          attached after registration.
        </p>
        <Input
          label="Hazard title"
          placeholder="e.g. Damaged crusher coupling guard"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          label="Description"
          placeholder="Describe the hazard and where it is observed"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Site"
            options={siteOptions}
            value={resolvedSite}
            onChange={(e) => setSiteId(e.target.value)}
            className="reg-site"
          />
          <Select
            label="Likelihood (1-5)"
            options={FACTOR_OPTIONS}
            value={likelihood}
            onChange={(e) => setLikelihood(e.target.value)}
            className="reg-likelihood"
          />
          <Select
            label="Consequence (1-5)"
            options={FACTOR_OPTIONS}
            value={consequence}
            onChange={(e) => setConsequence(e.target.value)}
            className="reg-consequence"
          />
        </div>
        {registerMutation.isError && (
          <p className="text-sm text-[#FF4D4F]">
            {registerMutation.error instanceof Error
              ? registerMutation.error.message
              : 'Registration failed.'}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            isLoading={registerMutation.isPending}
            disabled={!title.trim() || !description.trim() || !resolvedSite}
            onClick={handleSubmit}
          >
            Register hazard
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Manage hazard modal ──────────────────────────────────────────────────────

const ManageHazardModal = ({
  hazard,
  onClose,
  canWrite,
}: {
  hazard: Hazard | null;
  onClose: () => void;
  canWrite: boolean;
}) => {
  const addControlMutation = useAddHazardControl();
  const implementMutation = useImplementHazardControl();
  const assessMutation = useAssessHazardEffectiveness();
  const closeMutation = useCloseHazard();

  const [controlDescription, setControlDescription] = useState('');
  const [controlType, setControlType] = useState<HazardControlType>('engineering');
  const [closureNote, setClosureNote] = useState('');
  const [implementingId, setImplementingId] = useState<string | null>(null);

  if (!hazard) return <Modal isOpen={false} onClose={onClose} children={null} />;

  const isClosed = hazard.status === 'closed';
  const implementedCount = hazard.controls.filter((c) => c.implemented).length;
  const eff = hazard.effectiveness;

  const handleAddControl = async () => {
    if (!controlDescription.trim()) return;
    try {
      await addControlMutation.mutateAsync({
        id: hazard.id,
        input: { description: controlDescription.trim(), controlType },
      });
      setControlDescription('');
    } catch {
      // error surfaced below
    }
  };

  const handleImplement = async (controlId: string) => {
    setImplementingId(controlId);
    try {
      await implementMutation.mutateAsync({ id: hazard.id, controlId });
    } finally {
      setImplementingId(null);
    }
  };

  const handleAssess = async () => {
    try {
      await assessMutation.mutateAsync(hazard.id);
    } catch {
      // error surfaced below
    }
  };

  const handleClose = async () => {
    if (!closureNote.trim()) return;
    try {
      await closeMutation.mutateAsync({ id: hazard.id, closureNote: closureNote.trim() });
      setClosureNote('');
      onClose();
    } catch {
      // error surfaced below
    }
  };

  const mutationError =
    addControlMutation.isError
      ? addControlMutation.error instanceof Error
        ? addControlMutation.error.message
        : 'Failed to add control.'
      : implementMutation.isError
        ? implementMutation.error instanceof Error
          ? implementMutation.error.message
          : 'Failed to implement control.'
        : assessMutation.isError
          ? assessMutation.error instanceof Error
            ? assessMutation.error.message
            : 'Failed to assess effectiveness.'
          : closeMutation.isError
            ? closeMutation.error instanceof Error
              ? closeMutation.error.message
              : 'Failed to close hazard.'
            : null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Manage hazard"
      size="lg"
    >
      <div className="space-y-5" data-testid="hazard-manage-modal">
        {/* Identity + risk */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[13px] font-semibold text-[#E8F0F3]">{hazard.title}</p>
          <Badge status={hazard.status} />
          <span className="font-mono text-xs text-[#A4ADB2]">
            {hazard.likelihood}×{hazard.consequence} → {hazard.riskScore}
          </span>
          <Badge status={hazard.riskLevel} />
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#78919F]">{hazard.category}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-[#A4ADB2]">{hazard.description}</p>
        <p className="text-[11px] text-[#78919F]">
          Registered {formatDate(hazard.registeredAt)} · {hazard.siteName ?? hazard.siteId} ·{' '}
          {hazard.sourceType === 'alert'
            ? 'raised from a recurring-hazard alert'
            : hazard.sourceType === 'ocr'
              ? 'extracted from a scanned document (OCR)'
              : 'manual registration'}
        </p>

        {/* Effectiveness */}
        <div className="rounded-xl border border-[#21415A] bg-[#0C1A27] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#35C759]" />
              <p className="text-[13px] font-semibold text-[#F4F7F8]">Control effectiveness</p>
            </div>
            {eff && <Badge status={eff.status} />}
          </div>
          {eff ? (
            <div className="mt-3 space-y-1.5 text-[12px] text-[#A4ADB2]">
              <p>
                Reduction <span className="font-mono text-[#35C759]">−{eff.reduction}</span> on both
                drivers · residual risk{' '}
                <span className="font-mono">
                  {eff.residualLikelihood}×{eff.residualConsequence} → {eff.residualRiskScore}{' '}
                </span>
                <span className="text-[#8299A7]">({eff.residualRiskLevel})</span>
              </p>
              {eff.recurrenceOverride && (
                <p className="text-[#FF4D4F]">
                  Recurrence override — the pattern re-sighted after this control went live, so the
                  verdict is forced to ineffective regardless of tier.
                </p>
              )}
              <p className="text-[#8299A7]">{eff.note}</p>
              <p className="text-[10px] text-[#78919F]">Assessed {formatDate(eff.assessedAt)}</p>
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-[#8299A7]">
              Not yet assessed — implement a control, then run an assessment to derive the verdict.
            </p>
          )}
          {!isClosed && canWrite && implementedCount > 0 && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Target className="h-3.5 w-3.5" />}
                isLoading={assessMutation.isPending}
                onClick={handleAssess}
              >
                Assess effectiveness
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Hammer className="h-4 w-4 text-[#F5A623]" />
            <p className="text-[13px] font-semibold text-[#F4F7F8]">Control measures ({implementedCount}/{hazard.controls.length})</p>
          </div>
          {hazard.controls.length === 0 ? (
            <p className="text-[12px] text-[#8299A7]">No controls planned yet.</p>
          ) : (
            <div className="space-y-2">
              {hazard.controls.map((c) => (
                <div
                  key={c.id}
                  data-testid="hazard-control-row"
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#1E3545] bg-[#0C1A27] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-[#E8F0F3]">{c.description}</p>
                    <p className="text-[10px] text-[#78919F]">{CONTROL_TYPE_LABEL[c.controlType]}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.implemented ? (
                      <>
                        <span className="flex items-center gap-1 text-[11px] text-[#35C759]">
                          <CheckCircle2 className="h-3 w-3" /> Implemented
                        </span>
                        {c.implementedAt && (
                          <span className="text-[10px] text-[#78919F]">{formatDate(c.implementedAt)}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-[#F5A623]">Planned</span>
                        {!isClosed && canWrite && (
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={implementingId === c.id}
                            disabled={implementingId !== null}
                            onClick={() => handleImplement(c.id)}
                          >
                            Implement
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add control */}
          {!isClosed && canWrite ? (
            <div className="mt-3 space-y-3 rounded-xl border border-[#21415A] bg-[#0C1A27] p-4">
              <p className="text-[12px] text-[#8299A7]">
                Add a measure. Higher tiers reduce risk more: a strong implemented control is what
                flips effectiveness to <span className="text-[#35C759]">effective</span> (→ controlled).
              </p>
              <Input
                placeholder="Control description"
                value={controlDescription}
                onChange={(e) => setControlDescription(e.target.value)}
              />
              <Select
                compact
                label="Control type"
                options={CONTROL_TYPE_OPTIONS}
                value={controlType}
                onChange={(e) => setControlType(e.target.value as HazardControlType)}
                className="ctl-type"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  isLoading={addControlMutation.isPending}
                  disabled={!controlDescription.trim()}
                  onClick={handleAddControl}
                >
                  Add control
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#78919F]">
              <Lock className="h-3 w-3" /> Closed hazards are immutable — controls can no longer be
              added or implemented.
            </p>
          )}
        </div>

        {/* Close (only from controlled) */}
        {hazard.status === 'controlled' && canWrite && (
          <div className="space-y-3 rounded-xl border border-[#35C759]/30 bg-[#0C1A27] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#35C759]">
              <CheckCircle2 className="h-4 w-4" /> Hazard is controlled — it can now be closed.
            </p>
            <Input
              placeholder="Closure note (what was verified)"
              value={closureNote}
              onChange={(e) => setClosureNote(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="success"
                isLoading={closeMutation.isPending}
                disabled={!closureNote.trim()}
                onClick={handleClose}
              >
                Close hazard
              </Button>
            </div>
          </div>
        )}

        {/* Closed immutability note */}
        {isClosed && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#8D969B]">
            <Lock className="h-3.5 w-3.5" />
            Closed {formatDate(hazard.closedAt ?? '')} — {hazard.closureNote ?? 'no closure note'}.
          </p>
        )}

        {mutationError && <p className="text-sm text-[#FF4D4F]">{mutationError}</p>}

        {!isClosed && (
          <div className="flex justify-end pt-1">
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default HazardPage;