import React from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useDashboard } from '@/hooks/useAnalytics';
import { Card, KPICard, Badge, ListItem } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/date';
import { getStatusConfig } from '@/utils/status';

export default function DashboardScreen() {
  const theme = useTheme();
  const { data, isLoading, refetch, isRefetching } = useDashboard();

  const kpis = data?.kpis;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Welcome back</Text>
            <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <KPICard title="Total Mines" value={kpis?.totalMines ?? 0} icon="⛏️" color={theme.primary} />
          <KPICard title="Compliance" value={`${kpis?.complianceRate ?? 0}%`} icon="✅" color={theme.success} />
          <KPICard title="High Risk" value={kpis?.highRiskMines ?? 0} icon="🔴" color={theme.danger} />
          <KPICard title="Pending" value={kpis?.pendingInspections ?? 0} icon="📋" color={theme.info} />
          <KPICard title="Overdue" value={kpis?.overdueActions ?? 0} icon="⏰" color={theme.warning} />
        </View>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Alerts</Text>
          {data?.alerts && data.alerts.length > 0 ? (
            data.alerts.map((alert) => (
              <ListItem
                key={alert.id}
                title={alert.title}
                subtitle={alert.message}
                status={alert.severity}
                date={alert.createdAt}
              />
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No active alerts</Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Observations</Text>
          {data?.recentObservations && data.recentObservations.length > 0 ? (
            data.recentObservations.map((obs) => {
              const statusCfg = getStatusConfig(obs.status);
              return (
                <ListItem
                  key={obs.id}
                  title={obs.title}
                  subtitle={`${obs.category} • ${obs.severity}`}
                  status={obs.severity}
                  badge={statusCfg.label}
                  badgeColor={statusCfg.color}
                  date={obs.createdAt}
                />
              );
            })
          ) : (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No recent observations</Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: FontSize.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
