import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge, LoadingState, EmptyState, MockBadge } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/date';
import type { Notification } from '@/types';

export default function NotificationsScreen() {
  const theme = useTheme();
  const { data, isLoading } = useNotifications();

  const renderNotification = ({ item }: { item: Notification }) => {
    const typeColors: Record<string, string> = {
      info: theme.info,
      warning: theme.warning,
      error: theme.danger,
      success: theme.success,
    };
    const color = typeColors[item.type] || theme.info;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: item.read ? theme.surface : theme.surfaceElevated,
            borderColor: item.read ? theme.border : color + '30',
            borderLeftWidth: item.read ? 0 : 3,
            borderLeftColor: color,
          },
          pressed && { backgroundColor: theme.surfaceElevated },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Badge
            label={item.severity}
            color={color}
            backgroundColor={color + '20'}
            size="sm"
          />
        </View>
        <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.time, { color: theme.textMuted }]}>
          {formatRelativeTime(item.createdAt)}
        </Text>
      </Pressable>
    );
  };

  if (isLoading) return <LoadingState message="Loading notifications..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Notifications</Text>
          <MockBadge />
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {data?.meta.total || 0} notifications
        </Text>
      </View>

      <FlatList
        data={data?.data || []}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No notifications" icon="bell" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.one,
  },
  screenTitle: { fontSize: FontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: FontSize.sm },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.eight,
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  message: { fontSize: FontSize.sm, lineHeight: 18 },
  time: { fontSize: FontSize.xs },
});
