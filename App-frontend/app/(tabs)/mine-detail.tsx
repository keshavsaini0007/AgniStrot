import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useMine } from '@/hooks/useMines';
import { Card, Badge, LoadingState, EmptyState, Button, PngIcon } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate } from '@/utils/date';

export default function MineDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: mine, isLoading, error } = useMine(id || '');

  if (isLoading) return <LoadingState message="Loading mine details..." />;
  if (error || !mine) return <EmptyState title="Mine not found" icon="mine" />;

  const statusCfg = getStatusConfig(mine.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Button icon={<PngIcon name="right" size={16} flip />} title="Back" variant="ghost" onPress={() => router.back()} size="sm" />
        </View>

        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>{mine.name}</Text>
            <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
          </View>
          <Text style={[styles.code, { color: theme.textMuted }]}>{mine.code}</Text>
          <View style={styles.addressRow}>
            <PngIcon name="map-pin" size={14} />
            <Text style={[styles.address, { color: theme.textSecondary }]}>{mine.location.address}</Text>
          </View>
          {mine.subsidiary && (
            <Text style={[styles.subsidiary, { color: theme.textSecondary }]}>{mine.subsidiary}</Text>
          )}
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: mine.complianceRate >= 80 ? theme.success : theme.warning }]}>
              {mine.complianceRate}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Compliance</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: mine.riskScore >= 70 ? theme.danger : mine.riskScore >= 40 ? theme.warning : theme.success }]}>
              {mine.riskScore}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Risk Score</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.text }]}>{mine.openObservations}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Open Issues</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: mine.overdueActions > 0 ? theme.danger : theme.text }]}>{mine.overdueActions}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Overdue</Text>
          </Card>
        </View>

        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DETAILS</Text>
          <InfoRow label="Status" value={statusCfg.label} theme={theme} />
          <InfoRow label="Compliance Rate" value={`${mine.complianceRate}%`} theme={theme} />
          <InfoRow label="Risk Score" value={`${mine.riskScore}`} theme={theme} />
          <InfoRow label="Open Observations" value={`${mine.openObservations}`} theme={theme} />
          <InfoRow label="Overdue Actions" value={`${mine.overdueActions}`} theme={theme} />
          {mine.lastInspectionAt && (
            <InfoRow label="Last Inspection" value={formatDate(mine.lastInspectionAt)} theme={theme} />
          )}
          <InfoRow label="Created" value={formatDate(mine.createdAt)} theme={theme} />
          <InfoRow label="Updated" value={formatDate(mine.updatedAt)} theme={theme} />
        </Card>

        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>COORDINATES</Text>
          <InfoRow label="Latitude" value={`${mine.location.latitude}`} theme={theme} />
          <InfoRow label="Longitude" value={`${mine.location.longitude}`} theme={theme} />
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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: FontSize.xxl, fontWeight: '700', flex: 1 },
  code: { fontSize: FontSize.sm },
  address: { fontSize: FontSize.sm },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  subsidiary: { fontSize: FontSize.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', padding: Spacing.three, gap: Spacing.one },
  statValue: { fontSize: FontSize.xl, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs },
  infoCard: { gap: Spacing.two },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.one },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: 1 },
  infoLabel: { fontSize: FontSize.sm },
  infoValue: { fontSize: FontSize.sm, fontWeight: '500' },
});
