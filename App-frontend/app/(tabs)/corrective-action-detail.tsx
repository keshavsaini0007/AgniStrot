import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useCorrectiveAction } from '@/hooks/useCorrectiveActions';
import { useMines } from '@/hooks/useMines';
import { Card, Badge, LoadingState, EmptyState, Button } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate } from '@/utils/date';

export default function CorrectiveActionDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: action, isLoading, error } = useCorrectiveAction(id || '');
  const { data: minesData } = useMines();

  if (isLoading) return <LoadingState message="Loading corrective action..." />;
  if (error || !action) return <EmptyState title="Action not found" icon="🚨" />;

  const statusCfg = getStatusConfig(action.status);
  const priorityCfg = getStatusConfig(action.priority);
  const mine = minesData?.data?.find((m) => m.id === action.mineId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Button title="← Back" variant="ghost" onPress={() => router.back()} size="sm" />
        </View>

        <View style={styles.titleSection}>
          <View style={styles.badgeRow}>
            <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
            <Badge label={priorityCfg.label} color={priorityCfg.color} backgroundColor={priorityCfg.bg} size="sm" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{action.title}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {mine ? mine.name : action.mineId}
          </Text>
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
  badgeRow: { flexDirection: 'row', gap: Spacing.two },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: FontSize.md },
  infoCard: { gap: Spacing.two },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.one },
  description: { fontSize: FontSize.md, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: 1 },
  infoLabel: { fontSize: FontSize.sm },
  infoValue: { fontSize: FontSize.sm, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
});
