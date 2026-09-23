import { useState } from 'react';
import {
  Fingerprint,
  FileImage,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { useEvidence, useEvidenceDashboard, useVerifyEvidence, useVerifyAllEvidence } from '@/hooks/useEvidence';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { FilterBar } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/utils/date';
import type { Evidence, EvidenceDashboard } from '@/types';

// ── Feature 05: Evidence Integrity dashboard ────────────────────────────────
// Shows the SHA-256 attestation posture for every uploaded file (OCR documents
// + media photos). contentHash is the identity — the URL is display-only. A
// row flips to INTEGRITY_MISMATCH ONLY when recomputing the stored bytes
// disagrees with the recorded hash; legacy rows with no baseline are counted
// as ❔ and are never flagged as tampered.

const STATUS_OPTIONS = [
  { value: 'verified', label: 'Verified' },
  { value: 'INTEGRITY_MISMATCH', label: 'Integrity Mismatch' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'UPLOAD_FAILED', label: 'Upload Failed' },
  { value: 'UPLOAD_PENDING', label: 'Upload Pending' },
];

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

export const EvidencePage = () => {
  const { user, can } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useEvidence({
    page,
    limit: 10,
    status: status || undefined,
  });
  const dashboard = useEvidenceDashboard();
  const verifyMutation = useVerifyEvidence();
  const verifyAllMutation = useVerifyAllEvidence();

  if (error) return <ErrorState onRetry={refetch} />;

  const rows: Evidence[] = data?.data ?? [];
  const dash: EvidenceDashboard | undefined = dashboard.data?.data;
  const canVerifyAll = can('evidence', 'verifyAll');

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await verifyMutation.mutateAsync(id);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Integrity"
        subtitle="Server-side SHA-256 attestation of every uploaded file — the content hash is the identity, never the storage URL. Live re-verification recomputes the hash from the stored bytes."
        action={
          canVerifyAll ? (
            <Button
              variant="primary"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              isLoading={verifyAllMutation.isPending}
              onClick={() => verifyAllMutation.mutate()}
            >
              Verify all
            </Button>
          ) : undefined
        }
      />

      {/* Integrity counters */}
      <section aria-label="Evidence integrity counters" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total files" value={dash?.total ?? 0} color="text-[#5DB8FF]" icon={Fingerprint} testId="stat-total" />
        <MetricCard label="Checked" value={dash?.checked ?? 0} color="text-[#B9A0FF]" icon={ShieldCheck} testId="stat-checked" />
        <MetricCard label="Verified ✓" value={dash?.verified ?? 0} color="text-[#35C759]" icon={CheckCircle2} testId="stat-verified" />
        <MetricCard label="Integrity mismatch" value={dash?.mismatched ?? 0} color="text-[#FF4D4F]" icon={AlertTriangle} testId="stat-mismatched" />
        <MetricCard
          label="No baseline ❔"
          value={dash?.noBaseline ?? 0}
          color="text-[#8D969B]"
          icon={FileText}
          testId="stat-nobaseline"
        />
        <MetricCard label="Unverified" value={dash?.unverified ?? 0} color="text-[#A5BAC7]" icon={Clock} testId="stat-unverified" />
        <MetricCard label="Unavailable" value={dash?.unavailable ?? 0} color="text-[#F5A623]" icon={Ban} testId="stat-unavailable" />
        <MetricCard label="Upload failed" value={dash?.uploadFailed ?? 0} color="text-[#FF9F43]" icon={AlertTriangle} testId="stat-uploadfailed" />
      </section>

      <p className="text-[12px] leading-relaxed text-[#78919F]">
        No baseline ❔ — source documents that predate hashing (nothing to compare, never treated as tampered).
        Unavailable — the stored source could not be read during verification (cloud down / missing file).
        Duplicate content across rows is informational, never a fraud signal.
      </p>

      {/* List */}
      <Card>
        <div className="flex flex-col gap-3 border-b border-[#21415A] p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#F4F7F8]">Attestation ledger</h2>
            <p className="mt-1 text-[13px] text-[#8299A7]">
              {canVerifyAll
                ? 'Corporate & regulators can run a site-wide verification pass.'
                : user?.role === 'mine_official'
                  ? 'Scoped to your site. Individual rows can be re-verified.'
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
              className="sm:w-56"
            />
          </FilterBar>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} columns={7} /></div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No evidence records"
              description="No uploaded files match this filter. Files get a SHA-256 attestation at ingest."
            />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1080px]">
                <div className="grid grid-cols-[1.5fr_0.7fr_0.8fr_1.4fr_1fr_0.9fr_0.9fr] gap-4 border-b border-[#1E3545] px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-[#78919F]">
                  <span>File</span><span>Source</span><span>Uploader</span><span>Content hash</span><span>Status</span><span>Checks</span><span>Action</span>
                </div>
                {rows.map((row) => (
                  <EvidenceRow
                    key={row.id}
                    row={row}
                    verifying={verifyingId === row.id}
                    onVerify={() => handleVerify(row.id)}
                  />
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

const shortHash = (hash: string) => `${hash.slice(0, 10)}…${hash.slice(-8)}`;

const EvidenceRow = ({
  row,
  verifying,
  onVerify,
}: {
  row: Evidence;
  verifying: boolean;
  onVerify: () => void;
}) => {
  const isDocument = row.sourceType === 'document';
  const SourceIcon = isDocument ? FileText : FileImage;

  return (
    <div
      data-testid="evidence-row"
      className="grid grid-cols-[1.5fr_0.7fr_0.8fr_1.4fr_1fr_0.9fr_0.9fr] items-center gap-4 border-b border-[#1E3545] px-5 py-3 transition-colors hover:bg-[#102435]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#07121C]/80 text-[#5DB8FF]">
            <SourceIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] text-[#E8F0F3]">{row.fileName ?? 'untitled file'}</p>
            <p className="text-[10px] text-[#78919F]">{isDocument ? 'OCR document' : 'Media photo'}</p>
          </div>
        </div>
      </div>
      <span className="font-mono text-xs text-[#A4ADB2]">{row.sourceRecordId ?? '—'}</span>
      <span className="truncate text-xs text-[#A4ADB2]">{row.uploadedByName || 'system'}</span>
      <div className="min-w-0">
        {row.contentHash ? (
          <p className="truncate font-mono text-xs text-[#8D969B]" title={row.contentHash}>
            {shortHash(row.contentHash)}
          </p>
        ) : (
          <span className="text-xs text-[#78919F]">— no hash —</span>
        )}
        {row.duplicateCount > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#B9A0FF]">
            <Copy className="h-3 w-3" /> Same content ×{row.duplicateCount + 1}
          </p>
        )}
      </div>
      <div className="min-w-0">
        <Badge status={row.integrityStatus} />
        {row.verificationNote && (
          <p className="mt-0.5 truncate text-[10px] text-[#78919F]" title={row.verificationNote}>
            {row.verificationNote}
          </p>
        )}
      </div>
      <div className="min-w-0">
        {row.checkCount > 0 ? (
          <>
            <p className="text-xs text-[#A4ADB2]">{row.checkCount}× verified</p>
            <p className="text-[10px] text-[#78919F]">{formatDate(row.lastVerifiedAt ?? '')}</p>
          </>
        ) : (
          <span className="text-xs text-[#78919F]">never checked</span>
        )}
      </div>
      <div>
        <Button
          size="sm"
          variant="secondary"
          isLoading={verifying}
          disabled={verifying}
          onClick={onVerify}
          leftIcon={!verifying ? <RefreshCw className="h-3.5 w-3.5" /> : undefined}
        >
          Verify now
        </Button>
      </div>
    </div>
  );
};

export default EvidencePage;