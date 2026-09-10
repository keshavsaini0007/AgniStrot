import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useDashboard } from '@/hooks/useAnalytics';
import { Card, KPICard, LoadingState } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

export default function AnalyticsScreen() {
  const theme = useTheme();
  const { data, isLoading } = useDashboard();

  if (isLoading) return <LoadingState message="Loading analytics..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>AI Risk Intelligence</Text>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Risk Overview</Text>
          <View style={styles.kpiRow}>
            <KPICard title="High Risk" value={data?.kpis.highRiskMines ?? 0} icon="circle" color={theme.danger} />
            <KPICard title="Overdue" value={data?.kpis.overdueActions ?? 0} icon="alarm-clock" color={theme.warning} />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Risk Factors</Text>
          {data?.riskIntelligence?.slice(0, 3).map((risk, idx) => (
            <View key={idx} style={[styles.factorRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.factorLabel, { color: theme.textSecondary }]}>
                Mine {idx + 1}
              </Text>
              <View style={[styles.scoreBar, { backgroundColor: theme.surfaceElevated }]}>
                <View style={[styles.scoreFill, { width: `${risk.riskScore}%`, backgroundColor: risk.riskScore >= 70 ? theme.danger : risk.riskScore >= 40 ? theme.warning : theme.success }]} />
              </View>
              <Text style={[styles.factorScore, { color: theme.text }]}>{risk.riskScore}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Compliance Trend</Text>
          <View style={styles.trendChart}>
            {data?.complianceTrend?.map((point, idx) => (
              <View key={idx} style={styles.trendBar}>
                <View style={[styles.bar, { height: `${point.value}%`, backgroundColor: theme.primary }]} />
                <Text style={[styles.trendLabel, { color: theme.textMuted }]}>{point.date.split('-')[1]}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.twelve },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  section: { gap: Spacing.three },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', gap: Spacing.three },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, borderBottomWidth: 1 },
  factorLabel: { fontSize: FontSize.sm, width: 70 },
  scoreBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 4 },
  factorScore: { fontSize: FontSize.sm, fontWeight: '600', width: 30, textAlign: 'right' },
  trendChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, paddingTop: Spacing.two },
  trendBar: { alignItems: 'center', gap: Spacing.one },
  bar: { width: 30, borderRadius: 4 },
  trendLabel: { fontSize: FontSize.xs },
});
