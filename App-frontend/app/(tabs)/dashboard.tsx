import React from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useDashboard } from '@/hooks/useAnalytics';
import { Card, KPICard, ListItem, PngIcon, type PngIconName } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';

const FIELD_ACTIONS: { title: string; icon: PngIconName; screen: string }[] = [
  { title: 'New Inspection', icon: 'hard-hat', screen: '/capture/inspection' },
  { title: 'Report Incident', icon: 'flag', screen: '/capture/incident' },
  { title: 'Attendance', icon: 'time', screen: '/capture/attendance' },
  { title: 'Sync & Offline', icon: 'rocket', screen: '/capture/sync' },
];

const OBS_CATEGORY_ICONS: Record<string, PngIconName> = {
  safety: 'shield',
  environmental: 'leaf',
  operational: 'tools',
  compliance: 'scale',
  health: 'heart',
};

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
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
          <KPICard title="Total Mines" value={kpis?.totalMines ?? 0} icon="mine" color={theme.primary} />
          <KPICard title="Compliance" value={`${kpis?.complianceRate ?? 0}%`} icon="tick" color={theme.success} />
          <KPICard title="High Risk" value={kpis?.highRiskMines ?? 0} icon="skull" color={theme.danger} />
          <KPICard title="Pending" value={kpis?.pendingInspections ?? 0} icon="calendar" color={theme.info} />
          <KPICard title="Overdue" value={kpis?.overdueActions ?? 0} icon="alert" color={theme.warning} />
        </View>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Field Actions</Text>
          <View style={styles.actionGrid}>
            {FIELD_ACTIONS.map((action) => (
              <Pressable
                key={action.screen}
                onPress={() => router.push(action.screen as any)}
                style={({ pressed }) => [
                  styles.actionCard,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <PngIcon name={action.icon} size={20} />
                <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={2}>
                  {action.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

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
                icon="alert"
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
                  icon={OBS_CATEGORY_ICONS[obs.category] ?? 'zoom'}
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  actionCard: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  actionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
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
