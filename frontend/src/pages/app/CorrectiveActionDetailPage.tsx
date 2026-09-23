import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  User,
  Building2,
  CheckCircle2,
  FileText,
  Flag,
  ListOrdered,
  ShieldCheck,
  XCircle,
  ThumbsUp,
} from 'lucide-react';
import { useCorrectiveAction, useSubmitCloseout, useApproveCloseout, useRejectCloseout } from '@/hooks/useCorrectiveActions';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { DetailHeader } from '@/components/ui/DetailHeader';
import { formatDateTime, formatDate } from '@/utils/date';
import { sanitizeErrorMessage } from '@/utils/security';
import type { CorrectiveCloseout } from '@/types';

const inputClass =
  'w-full bg-[#171A1D]/10 border border-[#252A2D] rounded-lg px-4 py-2.5 text-[#F4F5F5] placeholder-[#8D969B] focus:outline-none focus:ring-2 focus:ring-[#D88A32]/50 focus:border-[#D88A32] transition-colors';

// Feature 08 — one user action at a time: submission and review are exclusive
// phases, so a single busy flag guards every button in the panel.
export const CorrectiveActionDetailPage = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const { user } = useAuth();
  const { data: action, isLoading, error, refetch } = useCorrectiveAction(actionId!);

  const submitCloseout = useSubmitCloseout();
  const approveCloseout = useApproveCloseout();
  const rejectCloseout = useRejectCloseout();

  const [recommendation, setRecommendation] = useState('');
  const [effectiveness, setEffectiveness] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  if (!action) return null;

  const closeout: CorrectiveCloseout | undefined = action.closeout;
  const role = user?.role;
  const isCorporate = role === 'corporate_manager';
  const canSubmit = role === 'mine_official' || isCorporate;
  // Fresh submission only on resolved; rejected allows resubmission. The
  // backend re-checks the resolved precondition + site scope on every write.
  const showSubmitForm =
    canSubmit && !closeout && action.status === 'resolved';
  const showResubmitForm =
    canSubmit && closeout?.status === 'rejected' && action.status === 'rejected';
  const showReviewPanel = isCorporate && closeout?.status === 'submitted';
  const formError =
    showResubmitForm && closeout?.reviewNote
      ? `Rejected by ${closeout.reviewedBy ?? 'corporate'} — ${closeout.reviewNote}`
      : null;

  const resetForm = () => {
    setRecommendation('');
    setEffectiveness('');
    setEvidenceNote('');
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    setBusy(true);
    setActionError(null);
    try {
      await submitCloseout.mutateAsync({
        id: action.id,
        input: { recommendation, effectiveness, evidenceNote: evidenceNote || undefined },
      });
      resetForm();
    } catch (err: any) {
      setActionError(sanitizeErrorMessage(err) ?? 'Failed to submit close-out');
    } finally {
      setBusy(false);
    }
  };

  const onReview = async (decision: 'approved' | 'rejected') => {
    if (!action) return;
    setBusy(true);
    setActionError(null);
    try {
      if (decision === 'approved') {
        await approveCloseout.mutateAsync({ id: action.id, reviewNote: reviewNote || undefined });
      } else {
        await rejectCloseout.mutateAsync({ id: action.id, reviewNote: reviewNote || undefined });
      }
      setReviewNote('');
    } catch (err: any) {
      setActionError(sanitizeErrorMessage(err) ?? 'Failed to review close-out');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <DetailHeader
        backTo="/app/corrective-actions"
        title={`Action ${action.id}`}
        subtitle={action.title}
        badges={
          <>
            <Badge status={action.priority} />
            <Badge status={action.status} />
            {closeout && <Badge status={closeout.status} />}
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Details</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <ListOrdered className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Observation ID</p>
                <p className="text-[#F4F5F5]">{action.observationId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <MapPin className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Mine</p>
                <p className="text-[#F4F5F5]">{action.mineId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <User className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Assigned to</p>
                <p className="text-[#F4F5F5]">{action.assignedTo ?? 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <Building2 className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Department</p>
                <p className="text-[#F4F5F5]">{action.department ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <Flag className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Priority</p>
                <p className="text-[#F4F5F5]">
                  <Badge status={action.priority} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <Calendar className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Due date</p>
                <p className="text-[#F4F5F5]">{formatDate(action.dueDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <CheckCircle2 className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Status</p>
                <p className="text-[#F4F5F5]">
                  <Badge status={action.status} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2">
              <FileText className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Created</p>
                <p className="text-[#F4F5F5]">{formatDateTime(action.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Description</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[#F4F5F5]">{action.description}</p>

            {action.resolutionNote && (
              <div className="rounded-lg border border-[#252A2D] bg-[#0D1722] p-4">
                <p className="text-sm text-[#8D969B]">Resolution note</p>
                <p className="mt-1 text-[#F4F5F5]">{action.resolutionNote}</p>
              </div>
            )}

            {action.verifiedBy && (
              <div className="rounded-lg border border-[#252A2D] bg-[#0D1722] p-4">
                <p className="text-sm text-[#8D969B]">Verified by</p>
                <p className="mt-1 text-[#F4F5F5]">
                  {action.verifiedBy}
                  {action.verifiedAt ? ` · ${formatDateTime(action.verifiedAt)}` : ''}
                </p>
              </div>
            )}

            <div className="border-t border-[#252A2D] pt-4">
              <p className="text-sm text-[#8D969B]">Last updated</p>
              <p className="mt-1 text-[#F4F5F5]">{formatDateTime(action.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Feature 08: close-out loop panel ─────────────────────────────── */}
      <div data-testid="closeout-panel">
      <Card>
        <CardHeader>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[#F4F5F5]">
            <ShieldCheck className="h-5 w-5 text-[#D88A32]" />
            Close-out
          </h3>
          {closeout && (
            <div className="mt-1">
              <Badge status={closeout.status} />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {actionError && (
            <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
              <p className="text-sm text-[#FF4D4F]">{actionError}</p>
            </div>
          )}

          {formError && (
            <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
              <p className="text-sm text-[#FF4D4F]">{formError}</p>
            </div>
          )}

          {!closeout && action.status === 'resolved' && (
            <p className="text-sm text-[#8D969B]">
              This corrective action is resolved. A mine official or corporate manager can submit
              the close-out evidence — what was done and how effectiveness was verified — for
              corporate sign-off.
            </p>
          )}
          {closeout?.status === 'submitted' && !isCorporate && (
            <p className="text-sm text-[#8D969B]">
              Close-out submitted and awaiting corporate review.
            </p>
          )}
          {closeout?.status === 'approved' && (
            <p className="text-sm text-[#8D969B]">
              This corrective action is closed. The close-out was approved by{' '}
              {closeout.reviewedBy ?? 'corporate'}.
            </p>
          )}

          {/* Submitted close-out record */}
          {closeout && (
            <div className="rounded-lg border border-[#252A2D] bg-[#0D1722] p-4 space-y-3">
              <div>
                <p className="text-sm text-[#8D969B]">Recommendation</p>
                <p className="mt-1 text-[#F4F5F5]">{closeout.recommendation}</p>
              </div>
              <div>
                <p className="text-sm text-[#8D969B]">Effectiveness</p>
                <p className="mt-1 text-[#F4F5F5]">{closeout.effectiveness}</p>
              </div>
              {closeout.evidenceNote && (
                <div>
                  <p className="text-sm text-[#8D969B]">Evidence note</p>
                  <p className="mt-1 text-[#F4F5F5]">{closeout.evidenceNote}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-[#252A2D] pt-3 text-sm text-[#8D969B]">
                <span>
                  Submitted by <span className="text-[#E8F0F3]">{closeout.submittedBy ?? '—'}</span> ·{' '}
                  {closeout.submittedAt ? formatDateTime(closeout.submittedAt) : ''}
                </span>
                {(closeout.status === 'approved' || closeout.status === 'rejected') && (
                  <span>
                    Reviewed by <span className="text-[#E8F0F3]">{closeout.reviewedBy ?? '—'}</span> ·{' '}
                    {closeout.reviewedAt ? formatDateTime(closeout.reviewedAt) : ''}
                  </span>
                )}
              </div>
              {closeout.reviewNote && (
                <div>
                  <p className="text-sm text-[#8D969B]">Review note</p>
                  <p className="mt-1 text-[#F4F5F5]">{closeout.reviewNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Submit / resubmit form (mine_official own-site + corporate) */}
          {(showSubmitForm || showResubmitForm) && (
            <form
              data-testid="closeout-submit-form"
              onSubmit={onFormSubmit}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-[#A4ADB2]">
                  Recommendation
                </label>
                <textarea
                  data-testid="closeout-recommendation"
                  className={inputClass}
                  rows={3}
                  placeholder="What did the site do to fix the root cause?"
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#A4ADB2]">
                  Effectiveness
                </label>
                <textarea
                  data-testid="closeout-effectiveness"
                  className={inputClass}
                  rows={3}
                  placeholder="How was the fix verified as effective?"
                  value={effectiveness}
                  onChange={(e) => setEffectiveness(e.target.value)}
                />
              </div>
              <Input
                data-testid="closeout-evidence"
                label="Evidence note (optional)"
                placeholder="Link to checklist entries, site records, photos…"
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  data-testid="closeout-submit"
                  variant="primary"
                  isLoading={busy}
                  disabled={recommendation.trim().length < 10 || effectiveness.trim().length < 10}
                >
                  {showResubmitForm ? 'Resubmit close-out' : 'Submit close-out'}
                </Button>
              </div>
            </form>
          )}

          {/* Corporate review — approve or reject a submitted close-out */}
          {showReviewPanel && (
            <div className="space-y-4 rounded-lg border border-[#252A2D] bg-[#0D1722] p-4">
              <p className="text-sm text-[#8D969B]">
                Review the close-out evidence. Approving closes this corrective action; rejecting
                sends it back to the submitter for revision.
              </p>
              <Input
                data-testid="closeout-review-note"
                label="Review note"
                placeholder="Approval reason or rejection feedback"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  data-testid="closeout-reject"
                  variant="danger"
                  leftIcon={<XCircle className="h-4 w-4" />}
                  isLoading={busy}
                  onClick={() => onReview('rejected')}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  data-testid="closeout-approve"
                  variant="primary"
                  leftIcon={<ThumbsUp className="h-4 w-4" />}
                  isLoading={busy}
                  onClick={() => onReview('approved')}
                >
                  Approve & close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};