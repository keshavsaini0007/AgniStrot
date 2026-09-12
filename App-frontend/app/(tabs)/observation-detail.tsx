import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useObservation } from '@/hooks/useObservations';
import { useMines } from '@/hooks/useMines';
import { Card, Badge, LoadingState, EmptyState, Button, PngIcon, type PngIconName } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate } from '@/utils/date';

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: PngIconName }> = {
  safety: { label: 'Safety', color: '#FF4D4F', bg: 'rgba(255,77,79,0.15)', icon: 'shield' },
  environmental: { label: 'Environmental', color: '#35C759', bg: 'rgba(53,199,89,0.15)', icon: 'leaf' },
  operational: { label: 'Operational', color: '#4DA3FF', bg: 'rgba(77,163,255,0.15)', icon: 'tools' },
  compliance: { label: 'Compliance', color: '#F5B942', bg: 'rgba(245,185,66,0.15)', icon: 'scale' },
  health: { label: 'Health', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', icon: 'heart' },
};

export default function ObservationDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: observation, isLoading, error } = useObservation(id || '');
  const { data: minesData } = useMines();

  if (isLoading) return <LoadingState message="Loading observation..." />;
  if (error || !observation) return <EmptyState title="Observation not found" icon="zoom" />;

  const statusCfg = getStatusConfig(observation.status);
  const severityCfg = getStatusConfig(observation.severity);
  const categoryCfg = CATEGORY_CONFIG[observation.category] || CATEGORY_CONFIG.safety;
  const mine = minesData?.data?.find((m) => m.id === observation.mineId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Button icon={<PngIcon name="right" size={16} flip />} title="Back" variant="ghost" onPress={() => router.back()} size="sm" />
        </View>

        <View style={styles.titleSection}>
          <View style={styles.badgeRow}>
            <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
            <Badge label={severityCfg.label} color={severityCfg.color} backgroundColor={severityCfg.bg} size="sm" />
            <PngIcon name={categoryCfg.icon} size={16} />
            <Badge label={categoryCfg.label} color={categoryCfg.color} backgroundColor={categoryCfg.bg} size="sm" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{observation.title}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {mine ? mine.name : observation.mineId}
          </Text>
        </View>

        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DESCRIPTION</Text>
          <Text style={[styles.description, { color: theme.text }]}>{observation.description}</Text>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DETAILS</Text>
          <InfoRow label="Category" value={categoryCfg.label} theme={theme} />
          <InfoRow label="Severity" value={severityCfg.label} theme={theme} />
          <InfoRow label="Status" value={statusCfg.label} theme={theme} />
          {observation.assignedDepartment && (
            <InfoRow label="Department" value={observation.assignedDepartment} theme={theme} />
          )}
          <InfoRow label="Reported By" value={observation.reportedBy} theme={theme} />
          {observation.inspectionId && (
            <InfoRow label="Inspection" value={observation.inspectionId} theme={theme} />
          )}
          <InfoRow label="Created" value={formatDate(observation.createdAt)} theme={theme} />
          <InfoRow label="Updated" value={formatDate(observation.updatedAt)} theme={theme} />
        </Card>

        {observation.location && (
          <Card style={styles.infoCard}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>LOCATION</Text>
            <InfoRow label="Latitude" value={`${observation.location.latitude}`} theme={theme} />
            <InfoRow label="Longitude" value={`${observation.location.longitude}`} theme={theme} />
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
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: FontSize.md },
  infoCard: { gap: Spacing.two },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.one },
  description: { fontSize: FontSize.md, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: 1 },
  infoLabel: { fontSize: FontSize.sm },
  infoValue: { fontSize: FontSize.sm, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
});
