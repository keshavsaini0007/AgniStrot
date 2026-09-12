import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Card, Badge, LoadingState, EmptyState, MockBadge, PngIcon, type PngIconName } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';
import { formatDateTime } from '@/utils/date';
import type { AuditLog } from '@/types';

const ACTION_ICONS: Record<string, PngIconName> = {
  LOGIN: 'key',
  CREATE: 'plus-circle',
  UPDATE: 'wrench',
  DELETE: 'trash-can',
};

export default function AuditLogsScreen() {
  const theme = useTheme();
  const { data, isLoading } = useAuditLogs();

  const actionColors: Record<string, string> = {
    LOGIN: theme.info,
    CREATE: theme.success,
    UPDATE: theme.warning,
    DELETE: theme.danger,
  };

  const renderLog = ({ item }: { item: AuditLog }) => {
    const color = actionColors[item.action] || theme.textSecondary;
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.actionRow}>
            <PngIcon name={ACTION_ICONS[item.action] ?? 'notebook'} size={16} />
            <Badge label={item.action} color={color} backgroundColor={color + '20'} size="sm" />
          </View>
          <Text style={[styles.timestamp, { color: theme.textMuted }]}>{formatDateTime(item.createdAt)}</Text>
        </View>
        <Text style={[styles.entity, { color: theme.text }]}>
          {item.entityType} • {item.ipAddress}
        </Text>
      </Card>
    );
  };

  if (isLoading) return <LoadingState message="Loading audit logs..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.title, { color: theme.text }]}>Audit Logs</Text>
          <MockBadge />
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{data?.meta.total || 0} entries</Text>
      </View>
      <FlatList
        data={data?.data || []}
        renderItem={renderLog}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No audit logs" icon="notebook" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.one },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: FontSize.sm },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.three, paddingTop: Spacing.three },
  card: { gap: Spacing.two },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  timestamp: { fontSize: FontSize.xs },
  entity: { fontSize: FontSize.sm },
});
