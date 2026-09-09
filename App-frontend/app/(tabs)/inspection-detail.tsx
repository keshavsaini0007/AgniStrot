import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useInspection } from '@/hooks/useInspections';
import { useMines } from '@/hooks/useMines';
import { Card, Badge, LoadingState, EmptyState, Button } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate, formatDateTime } from '@/utils/date';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  safety: { label: 'Safety', color: '#FF4D4F', bg: 'rgba(255,77,79,0.15)' },
  environmental: { label: 'Environmental', color: '#35C759', bg: 'rgba(53,199,89,0.15)' },
  operational: { label: 'Operational', color: '#4DA3FF', bg: 'rgba(77,163,255,0.15)' },
  statutory: { label: 'Statutory', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
};

export default function InspectionDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: inspection, isLoading, error } = useInspection(id || '');
  const { data: minesData } = useMines();

  if (isLoading) return <LoadingState message="Loading inspection..." />;
  if (error || !inspection) return <EmptyState title="Inspection not found" icon="📋" />;

  const statusCfg = getStatusConfig(inspection.status);
  const typeCfg = TYPE_CONFIG[inspection.type] || TYPE_CONFIG.safety;
  const mine = minesData?.data?.find((m) => m.id === inspection.mineId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Button title="← Back" variant="ghost" onPress={() => router.back()} size="sm" />
        </View>

        <View style={styles.titleSection}>
          <View style={styles.badgeRow}>
            <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
            <Badge label={typeCfg.label} color={typeCfg.color} backgroundColor={typeCfg.bg} size="sm" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Inspection Details</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {mine ? mine.name : inspection.mineId}
          </Text>
        </View>

        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INSPECTION INFO</Text>
          <InfoRow label="Type" value={typeCfg.label} theme={theme} />
          <InfoRow label="Status" value={statusCfg.label} theme={theme} />
          <InfoRow label="Scheduled" value={formatDateTime(inspection.scheduledAt)} theme={theme} />
          {inspection.startedAt && (
            <InfoRow label="Started" value={formatDateTime(inspection.startedAt)} theme={theme} />
          )}
          {inspection.completedAt && (
            <InfoRow label="Completed" value={formatDateTime(inspection.completedAt)} theme={theme} />
          )}
          <InfoRow label="Observations" value={`${inspection.observationsCount}`} theme={theme} />
          {inspection.notes && <InfoRow label="Notes" value={inspection.notes} theme={theme} />}
          <InfoRow label="Created" value={formatDate(inspection.createdAt)} theme={theme} />
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
  badgeRow: { flexDirection: 'row', gap: Spacing.two },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: FontSize.md },
  infoCard: { gap: Spacing.two },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.one },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: 1 },
  infoLabel: { fontSize: FontSize.sm },
  infoValue: { fontSize: FontSize.sm, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
});
