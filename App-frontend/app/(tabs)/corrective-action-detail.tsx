import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import {
  useCorrectiveAction,
  useSubmitCloseout,
  useApproveCloseout,
  useRejectCloseout,
} from '@/hooks/useCorrectiveActions';
import { useMines } from '@/hooks/useMines';
import { useAuth } from '@/hooks/useAuth';
import { Card, Badge, LoadingState, EmptyState, Button, TextInput, PngIcon } from '@/components/ui';
import { AppNavbar } from '@/components/AppNavbar';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate } from '@/utils/date';
import type { CorrectiveCloseout } from '@/types';

export default function CorrectiveActionDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: action, isLoading, error } = useCorrectiveAction(id || '');
  const { data: minesData } = useMines();
  const { user } = useAuth();

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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <AppNavbar />
        <LoadingState message="Loading corrective action..." />
      </SafeAreaView>
    );
  }
  if (error || !action) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <AppNavbar />
        <EmptyState title="Action not found" icon="wrench" />
      </SafeAreaView>
    );
  }

  const statusCfg = getStatusConfig(action.status);
  const priorityCfg = getStatusConfig(action.priority);
  const mine = minesData?.data?.find((m) => m.id === action.mineId);
  const siteLabel = action.siteName ?? mine?.name ?? action.mineId;
  const closeout: CorrectiveCloseout | undefined = action.closeout;

  // ── Feature 08 gating (mirrors the web detail page) ───────────────────────
  const role = user?.role;
  const isCorporate = role === 'corporate_manager';
  const canSubmit = role === 'mine_official' || isCorporate;
  const showSubmitForm = canSubmit && !closeout && action.status === 'resolved';
  const showResubmitForm =
    canSubmit && closeout?.status === 'rejected' && action.status === 'rejected';
  const showReviewPanel = isCorporate && closeout?.status === 'submitted';
  const formError =
    showResubmitForm && closeout.reviewNote
      ? `Rejected by ${closeout.reviewedBy ?? 'corporate'} — ${closeout.reviewNote}`
      : null;

  const resetForm = () => {
    setRecommendation('');
    setEffectiveness('');
    setEvidenceNote('');
  };

  const submitDisabled = recommendation.trim().length < 10 || effectiveness.trim().length < 10;

  const onSubmitForm = async () => {
    if (!action || submitDisabled) return;
    setBusy(true);
    setActionError(null);
    try {
      await submitCloseout.mutateAsync({
        id: action.id,
        input: { recommendation, effectiveness, evidenceNote: evidenceNote.trim() || undefined },
      });
      resetForm();
    } catch (err: any) {
      setActionError(err?.message || (err instanceof Error ? err.message : 'Failed to submit close-out.'));
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
        await approveCloseout.mutateAsync({ id: action.id, reviewNote: reviewNote.trim() || undefined });
      } else {
        await rejectCloseout.mutateAsync({ id: action.id, reviewNote: reviewNote.trim() || undefined });
      }
      setReviewNote('');
    } catch (err: any) {
      setActionError(err?.message || (err instanceof Error ? err.message : 'Failed to review close-out.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <AppNavbar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Button
            icon={<PngIcon name="right" size={16} flip />}
            title="Back"
            variant="ghost"
            onPress={() => router.back()}
            size="sm"
          />
        </View>

        <View style={styles.titleSection}>
          <View style={styles.badgeRow}>
            <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
            <Badge label={priorityCfg.label} color={priorityCfg.color} backgroundColor={priorityCfg.bg} size="sm" />
            {closeout && (
              <Badge
                label={closeout.status}
                color={closeout.status === 'approved' ? '#35C759' : closeout.status === 'rejected' ? '#FF4D4F' : '#F5B942'}
                backgroundColor={
                  closeout.status === 'approved'
                    ? 'rgba(53,199,89,0.15)'
                    : closeout.status === 'rejected'
                      ? 'rgba(255,77,79,0.15)'
                      : 'rgba(245,185,66,0.15)'
                }
                size="sm"
              />
            )}
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{action.title}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{siteLabel}</Text>
        </View>

        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DESCRIPTION</Text>
          <Text style={[styles.description, { color: theme.text }]}>{action.description}</Text>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DETAILS</Text>
          <InfoRow label="Status" value={statusCfg.label} theme={theme} />
          <InfoRow label="Priority" value={priorityCfg.label} theme={theme} />
          <InfoRow label="Due Date" value={formatDate(action.dueDate)} theme={theme} />
          {action.department && <InfoRow label="Department" value={action.department} theme={theme} />}
          {action.assignedTo && <InfoRow label="Assigned To" value={action.assignedTo} theme={theme} />}
          <InfoRow label="Observation" value={action.observationId} theme={theme} />
          <InfoRow label="Created" value={formatDate(action.createdAt)} theme={theme} />
          <InfoRow label="Updated" value={formatDate(action.updatedAt)} theme={theme} />
        </Card>

        {action.resolutionNote && (
          <Card style={styles.infoCard}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>RESOLUTION</Text>
            <Text style={[styles.description, { color: theme.text }]}>{action.resolutionNote}</Text>
            {action.verifiedBy && (
              <InfoRow label="Verified By" value={action.verifiedBy} theme={theme} />
            )}
            {action.verifiedAt && (
              <InfoRow label="Verified At" value={formatDate(action.verifiedAt)} theme={theme} />
            )}
          </Card>
        )}

        {/* ── Feature 08: close-out loop panel ─────────────────────────────── */}
        <Card style={styles.infoCard} testID="closeout-panel">
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CLOSE-OUT</Text>

          {actionError && (
            <View style={[styles.errorBox, { borderColor: '#FF4D4F40', backgroundColor: 'rgba(255,77,79,0.1)' }]}>
              <Text style={[styles.errorText, { color: '#FF4D4F' }]}>{actionError}</Text>
            </View>
          )}
          {formError && (
            <View style={[styles.errorBox, { borderColor: '#FF4D4F40', backgroundColor: 'rgba(255,77,79,0.1)' }]}>
              <Text style={[styles.errorText, { color: '#FF4D4F' }]}>{formError}</Text>
            </View>
          )}

          {!closeout && action.status === 'resolved' && (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              This corrective action is resolved. A mine official or corporate manager can submit
              the close-out evidence for corporate sign-off.
            </Text>
          )}
          {closeout?.status === 'submitted' && !isCorporate && (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Close-out submitted and awaiting corporate review.
            </Text>
          )}
          {closeout?.status === 'approved' && (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              This corrective action is closed. The close-out was approved by{' '}
              {closeout.reviewedBy ?? 'corporate'}.
            </Text>
          )}

          {/* Submitted close-out record */}
          {closeout && (
            <View style={[styles.closeoutRecord, { borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}>
              <View>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Recommendation</Text>
                <Text style={[styles.recordText, { color: theme.text }]}>{closeout.recommendation}</Text>
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Effectiveness</Text>
                <Text style={[styles.recordText, { color: theme.text }]}>{closeout.effectiveness}</Text>
              </View>
              {closeout.evidenceNote && (
                <View>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Evidence note</Text>
                  <Text style={[styles.recordText, { color: theme.text }]}>{closeout.evidenceNote}</Text>
                </View>
              )}
              <Text style={[styles.hint, { color: theme.textMuted }]}>
                Submitted by {closeout.submittedBy ?? '—'} · {formatDate(closeout.submittedAt)}
              </Text>
              {(closeout.status === 'approved' || closeout.status === 'rejected') && (
                <Text style={[styles.hint, { color: theme.textMuted }]}>
                  Reviewed by {closeout.reviewedBy ?? '—'}
                  {closeout.reviewedAt ? ` · ${formatDate(closeout.reviewedAt)}` : ''}
                </Text>
              )}
              {closeout.reviewNote && (
                <View>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Review note</Text>
                  <Text style={[styles.recordText, { color: theme.text }]}>{closeout.reviewNote}</Text>
                </View>
              )}
            </View>
          )}

          {/* Submit / resubmit form (mine_official own-site + corporate) */}
          {(showSubmitForm || showResubmitForm) && (
            <View style={styles.formBlock}>
              <TextInput
                label="Recommendation"
                placeholder="What did the site do to fix the root cause?"
                value={recommendation}
                onChangeText={setRecommendation}
                multiline
                numberOfLines={3}
                style={styles.multilineInput}
                testID="closeout-recommendation"
              />
              <TextInput
                label="Effectiveness"
                placeholder="How was the fix verified as effective?"
                value={effectiveness}
                onChangeText={setEffectiveness}
                multiline
                numberOfLines={3}
                style={styles.multilineInput}
                testID="closeout-effectiveness"
              />
              <TextInput
                label="Evidence note (optional)"
                placeholder="Link to checklist entries, site records, photos…"
                value={evidenceNote}
                onChangeText={setEvidenceNote}
                testID="closeout-evidence"
              />
              <Button
                title={showResubmitForm ? 'Resubmit close-out' : 'Submit close-out'}
                variant="primary"
                loading={busy}
                disabled={submitDisabled}
                onPress={onSubmitForm}
                testID="closeout-submit"
              />
            </View>
          )}

          {/* Corporate review — approve or reject a submitted close-out */}
          {showReviewPanel && (
            <View style={styles.formBlock}>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Review the close-out evidence. Approving closes this corrective action; rejecting
                sends it back to the submitter for revision.
              </Text>
              <TextInput
                label="Review note"
                placeholder="Approval reason or rejection feedback"
                value={reviewNote}
                onChangeText={setReviewNote}
                testID="closeout-review-note"
              />
              <View style={styles.reviewRow}>
                <Button
                  title="Reject"
                  variant="danger"
                  loading={busy}
                  onPress={() => onReview('rejected')}
                  testID="closeout-reject"
                />
                <Button
                  title="Approve & close"
                  variant="primary"
                  loading={busy}
                  onPress={() => onReview('approved')}
                  testID="closeout-approve"
                />
              </View>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.twelve },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  titleSection: { gap: Spacing.two },
  badgeRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: FontSize.md },
  infoCard: { gap: Spacing.two },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.one },
  description: { fontSize: FontSize.md, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: 1 },
  infoLabel: { fontSize: FontSize.sm },
  infoValue: { fontSize: FontSize.sm, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  hint: { fontSize: FontSize.xs, lineHeight: 16 },
  errorBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.three,
  },
  errorText: { fontSize: FontSize.sm },
  closeoutRecord: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '500' },
  recordText: { fontSize: FontSize.sm, lineHeight: 20 },
  formBlock: { gap: Spacing.three, marginTop: Spacing.two },
  multilineInput: { minHeight: 96 },
  reviewRow: { flexDirection: 'row', gap: Spacing.three, justifyContent: 'flex-end' },
});