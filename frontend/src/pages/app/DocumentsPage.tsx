import { useRef, useState } from 'react';
import { FileText, Upload, CheckCircle2, Loader2, ScanText } from 'lucide-react';
import { useDocuments, useIngestDocument, useConfirmDocument } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { validateFile, sanitizeErrorMessage } from '@/utils/security';
import { formatDate } from '@/utils/date';
import type { OcrDocument } from '@/types';
import documentsHeaderImg from '../../../assets/images/Documents.png';

export const DocumentsPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page] = useState(1);
  const [confirming, setConfirming] = useState<OcrDocument | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const { user, can } = useAuth();
  const { data, isLoading, error, refetch } = useDocuments({ page, limit: 10 });
  const ingest = useIngestDocument();
  const confirm = useConfirmDocument();

  if (error) return <ErrorState onRetry={refetch} />;

  const documents = data?.data || [];

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const validation = validateFile(file);
    if (!validation.valid) {
      ingest.reset();
      return;
    }

    try {
      if (!user?.siteId) {
        throw new Error('No site is assigned to your account.');
      }
      await ingest.mutateAsync({ file, siteId: user.siteId });
    } catch {
      // surfaced below via mutation error state
    }
  };

  const openConfirm = (doc: OcrDocument) => {
    setConfirming(doc);
    const initial: Record<string, string> = {};
    Object.entries(doc.extractedFields ?? {}).forEach(([key, value]) => {
      initial[key] = String(value ?? '');
    });
    setFields(initial);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="OCR ingest of paper forms awaiting human confirmation"
        backgroundImage={documentsHeaderImg}
        action={
          can('documents', 'create') ? (
            <>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
              <Button
                variant="primary"
                leftIcon={ingest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
                isLoading={ingest.isPending}
              >
                {ingest.isPending ? 'Scanning...' : 'Scan Document'}
              </Button>
            </>
          ) : null
        }
      />

      {ingest.isError && (
        <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
          <p className="text-sm text-[#FF4D4F]">{sanitizeErrorMessage(ingest.error) ?? 'Failed to scan document'}</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} columns={5} /></div>
          ) : documents.length === 0 ? (
            <EmptyState title="No documents" description="Scan a paper form to begin OCR extraction." />
          ) : (
            <div className="divide-y divide-[#252A2D]">
              {documents.map((doc) => (
                <div key={doc.id} className="px-6 py-4 hover:bg-[#171A1D] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#4DA3FF]/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#4DA3FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F4F5F5] truncate">{doc.id}</p>
                      <p className="text-xs text-[#8D969B]">
                        {doc.siteId} • {formatDate(doc.createdAt)} • {Object.keys(doc.extractedFields ?? {}).length} fields extracted
                      </p>
                    </div>
                    <Badge status={doc.reviewStatus} />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={doc.reviewStatus === 'confirmed'}
                      leftIcon={<CheckCircle2 className="w-4 h-4 text-[#35C759]" />}
                      onClick={() => openConfirm(doc)}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={Boolean(confirming)} onClose={() => setConfirming(null)} title="Confirm extracted fields" size="lg">
        <div className="mb-4 flex items-center gap-2 text-xs text-[#8299A7]">
          <ScanText className="h-4 w-4 text-[#D88A32]" />
          Review the OCR output below before locking the record as confirmed.
        </div>
        <div className="space-y-3">
          {Object.entries(fields).map(([key, value]) => (
            <Input
              key={key}
              label={key}
              value={value ?? ''}
              onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
          <Button
            variant="primary"
            isLoading={confirm.isPending}
            onClick={async () => {
              if (!confirming) return;
              try {
                await confirm.mutateAsync({ id: confirming.id, fields: Object.entries(fields).map(([k, v]) => ({ fieldName: k, value: v })) });
                setConfirming(null);
              } catch {
                // surfaced via mutation error
              }
            }}
          >
            Confirm record
          </Button>
        </div>
      </Modal>
    </div>
  );
};