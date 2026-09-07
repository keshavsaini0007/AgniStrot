import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Card, Badge, EmptyState } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { formatDateTime } from '@/utils/date';

const mockLogs = [
  { id: 'log-001', action: 'LOGIN', entityType: 'user', userId: 'usr-001', details: { email: 'rahul@coalindia.com' }, ipAddress: '192.168.1.1', createdAt: '2026-08-22T08:15:00Z' },
  { id: 'log-002', action: 'CREATE', entityType: 'inspection', userId: 'usr-003', details: { mineId: 'mine-001' }, ipAddress: '192.168.1.2', createdAt: '2026-08-22T08:30:00Z' },
  { id: 'log-003', action: 'UPDATE', entityType: 'observation', userId: 'usr-003', details: { id: 'obs-001' }, ipAddress: '192.168.1.2', createdAt: '2026-08-22T09:00:00Z' },
  { id: 'log-004', action: 'CREATE', entityType: 'corrective_action', userId: 'usr-001', details: { id: 'ca-003' }, ipAddress: '192.168.1.1', createdAt: '2026-08-22T09:30:00Z' },
  { id: 'log-005', action: 'LOGIN', entityType: 'user', userId: 'usr-004', details: { email: 'admin@coalindia.com' }, ipAddress: '192.168.1.5', createdAt: '2026-08-22T10:00:00Z' },
];

export default function AuditLogsScreen() {
  const theme = useTheme();

  const actionColors: Record<string, string> = {
    LOGIN: theme.info,
    CREATE: theme.success,
    UPDATE: theme.warning,
    DELETE: theme.danger,
  };

  const renderLog = ({ item }: { item: typeof mockLogs[0] }) => {
    const color = actionColors[item.action] || theme.textSecondary;
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Badge label={item.action} color={color} backgroundColor={color + '20'} size="sm" />
          <Text style={[styles.timestamp, { color: theme.textMuted }]}>{formatDateTime(item.createdAt)}</Text>
        </View>
        <Text style={[styles.entity, { color: theme.text }]}>
          {item.entityType} • {item.ipAddress}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Audit Logs</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{mockLogs.length} entries</Text>
      </View>
      <FlatList
        data={mockLogs}
        renderItem={renderLog}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
  timestamp: { fontSize: FontSize.xs },
  entity: { fontSize: FontSize.sm },
});
