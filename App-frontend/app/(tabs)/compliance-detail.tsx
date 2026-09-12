import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useCompliance } from '@/hooks/useCompliance';
import { useMines } from '@/hooks/useMines';
import { Card, Badge, LoadingState, EmptyState, Button, PngIcon } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate } from '@/utils/date';

export default function ComplianceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: complianceData, isLoading, error } = useCompliance();
  const { data: minesData } = useMines();

  const compliance = complianceData?.data?.find((c) => c.id === id);

  if (isLoading) return <LoadingState message="Loading compliance..." />;
  if (error || !compliance) return <EmptyState title="Compliance not found" icon="scale" />;

  const statusCfg = getStatusConfig(compliance.status);
  const mine = minesData?.data?.find((m) => m.id === compliance.mineId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Button icon={<PngIcon name="right" size={16} flip />} title="Back" variant="ghost" onPress={() => router.back()} size="sm" />
        </View>

        <View style={styles.titleSection}>
          <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
          <Text style={[styles.title, { color: theme.text }]}>{compliance.requirement}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {mine ? mine.name : compliance.mineId}
          </Text>
        </View>

        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DESCRIPTION</Text>
          <Text style={[styles.description, { color: theme.text }]}>{compliance.description}</Text>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DETAILS</Text>
          <InfoRow label="Category" value={compliance.category} theme={theme} />
          <InfoRow label="Status" value={statusCfg.label} theme={theme} />
          <InfoRow label="Due Date" value={formatDate(compliance.dueDate)} theme={theme} />
          <InfoRow label="Department" value={compliance.responsibleDepartment} theme={theme} />
          {compliance.lastReviewedAt && (
            <InfoRow label="Last Reviewed" value={formatDate(compliance.lastReviewedAt)} theme={theme} />
          )}
          <InfoRow label="Created" value={formatDate(compliance.createdAt)} theme={theme} />
          <InfoRow label="Updated" value={formatDate(compliance.updatedAt)} theme={theme} />
        </Card>

        {compliance.documents.length > 0 && (
          <Card style={styles.infoCard}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DOCUMENTS</Text>
            {compliance.documents.map((doc, idx) => (
              <View key={idx} style={styles.docItemRow}>
                <PngIcon name="file-text" size={14} />
                <Text style={[styles.docItem, { color: theme.text }]}>{doc}</Text>
              </View>
            ))}
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
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: FontSize.md },
  infoCard: { gap: Spacing.two },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.one },
  description: { fontSize: FontSize.md, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: 1 },
  infoLabel: { fontSize: FontSize.sm },
  infoValue: { fontSize: FontSize.sm, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  docItemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  docItem: { fontSize: FontSize.sm, flex: 1 },
});
