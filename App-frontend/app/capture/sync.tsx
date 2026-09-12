import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTheme } from '@/hooks/use-theme';
import { useSyncStatus, useSyncNow } from '@/hooks/useSync';
import { Card, Button, Badge, Icon, PngIcon, type PngIconName } from '@/components/ui';
import { getPending, type QueueKind, type QueuedRecord } from '@/api/offlineQueue';
import { formatDateTime } from '@/utils/date';
import { FontSize, Spacing } from '@/constants/theme';

const KINDS: { kind: QueueKind; icon: PngIconName; label: string }[] = [
  { kind: 'inspection', icon: 'hard-hat', label: 'Inspections' },
  { kind: 'incident', icon: 'flag', label: 'Incidents' },
  { kind: 'attendance', icon: 'time', label: 'Attendance' },
];

const describeRecord = (record: QueuedRecord): string => {
  const payload = record.payload;
  const type = payload.type as string | undefined;
  const severity = payload.severity as string | undefined;
  const category = payload.category as string | undefined;
  const checkType = payload.checkType as string | undefined;
  const workerRef = payload.workerRef as string | undefined;
  if (type) return `${type} inspection`;
  if (severity) return `${severity} ${category ?? ''} incident`.trim();
  if (checkType) return `${checkType === 'in' ? 'Check-in' : 'Check-out'} ${workerRef ?? ''}`.trim();
  return 'Queued record';
};

export default function SyncScreen() {
  const theme = useTheme();
  const netInfo = useNetInfo();
  const { data: status, isLoading } = useSyncStatus();
  const syncNow = useSyncNow();

  const [expanded, setExpanded] = useState<QueueKind | null>(null);
  const [records, setRecords] = useState<QueuedRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const online = netInfo.isConnected !== false;
  const pendingTotal = status
    ? KINDS.reduce((sum, k) => sum + (status[k.kind].pending || 0), 0)
    : 0;

  const toggleKind = async (kind: QueueKind) => {
    if (expanded === kind) {
      setExpanded(null);
      return;
    }
    setExpanded(kind);
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      setRecords(await getPending(kind));
    } catch {
      setRecordsError('Could not load pending records.');
    } finally {
      setRecordsLoading(false);
    }
  };

  const summary = syncNow.data;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <View style={styles.networkRow}>
            <View
              style={[
                styles.networkDot,
                { backgroundColor: online ? theme.success : theme.danger },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.networkTitle, { color: theme.text }]}>
                {online ? 'Online' : 'Offline'}
              </Text>
              <Text style={[styles.networkSub, { color: theme.textMuted }]}>
                Records sync automatically when the network is available.
              </Text>
            </View>
            <Badge
              label={pendingTotal > 0 ? `${pendingTotal} pending` : 'All synced'}
              color={pendingTotal > 0 ? theme.warning : theme.success}
              backgroundColor={pendingTotal > 0 ? theme.warning + '20' : theme.success + '20'}
              size="sm"
            />
          </View>
        </Card>

        <Button
          title="Sync Now"
          loading={syncNow.isPending}
          disabled={!online}
          icon={<Icon name="refresh-cw" size={18} color="#FFFFFF" />}
          onPress={() => syncNow.mutate()}
          style={styles.syncButton}
        />

        {summary && (
          <Card style={styles.section}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>Last Result</Text>
            {summary.synced.length === 0 && summary.failed.length === 0 && (
              <Text style={[styles.summaryText, { color: theme.textMuted }]}>
                Nothing to sync.
              </Text>
            )}
            {summary.synced.map((outcome) => (
              <View key={outcome.kind} style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                  {outcome.kind}
                </Text>
                <Text style={[styles.summaryText, { color: theme.text }]}>
                  {outcome.result.accepted.length} synced, {outcome.result.rejected.length} rejected
                </Text>
              </View>
            ))}
            {summary.failed.length > 0 && (
              <Text style={[styles.summaryError, { color: theme.danger }]}>
                Could not reach the server ({summary.failed.join(', ')}). They remain queued.
              </Text>
            )}
          </Card>
        )}

        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.loading} />
        ) : (
          KINDS.map((config) => {
            const entry = status?.[config.kind];
            const pending = entry?.pending || 0;
            const isOpen = expanded === config.kind;
            return (
              <Card key={config.kind} style={styles.kindCard}>
                <Pressable onPress={() => toggleKind(config.kind)} style={styles.kindRow}>
                  <PngIcon name={config.icon} size={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.kindLabel, { color: theme.text }]}>{config.label}</Text>
                    <Text style={[styles.kindMeta, { color: theme.textMuted }]}>
                      {pending > 0
                        ? `${pending} queued`
                        : 'Nothing queued'}{' '}
                      · Last synced {entry?.lastSyncedAt ? formatDateTime(entry.lastSyncedAt) : 'never'}
                    </Text>
                  </View>
                  <View style={isOpen && styles.chevronOpen}>
                    <PngIcon name="right" size={18} />
                  </View>
                </Pressable>

                {isOpen &&
                  (recordsLoading ? (
                    <ActivityIndicator color={theme.primary} style={styles.recordsLoading} />
                  ) : (
                    <View style={[styles.recordsBox, { borderTopColor: theme.border }]}>
                      {recordsError && (
                        <Text style={[styles.recordsError, { color: theme.danger }]}>
                          {recordsError}
                        </Text>
                      )}
                      {!recordsError && records.length === 0 && (
                        <Text style={[styles.recordsEmpty, { color: theme.textMuted }]}>
                          No pending {config.label.toLowerCase()} records.
                        </Text>
                      )}
                      {records.map((record) => (
                        <View key={record.clientUuid} style={styles.recordRow}>
                          <Text style={[styles.recordDesc, { color: theme.text }]} numberOfLines={1}>
                            {describeRecord(record)}
                          </Text>
                          <Text style={[styles.recordMeta, { color: theme.textMuted }]}>
                            {formatDateTime(record.queuedAt)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.twelve,
  },
  section: {
    gap: Spacing.two,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  networkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  networkTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  networkSub: {
    fontSize: FontSize.xs,
  },
  syncButton: {
    alignSelf: 'stretch',
  },
  summaryTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    textTransform: 'capitalize',
  },
  summaryText: {
    fontSize: FontSize.sm,
  },
  summaryError: {
    fontSize: FontSize.sm,
  },
  loading: {
    marginTop: Spacing.six,
  },
  kindCard: {
    gap: Spacing.two,
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  kindLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  kindMeta: {
    fontSize: FontSize.xs,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  recordsLoading: {
    paddingVertical: Spacing.three,
  },
  recordsBox: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  recordsEmpty: {
    fontSize: FontSize.sm,
    paddingVertical: Spacing.three,
  },
  recordsError: {
    fontSize: FontSize.sm,
  },
  recordRow: {
    paddingVertical: Spacing.two,
    gap: 2,
  },
  recordDesc: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  recordMeta: {
    fontSize: FontSize.xs,
  },
});