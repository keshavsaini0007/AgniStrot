import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useUsers } from '@/hooks/useUsers';
import { Card, Badge, LoadingState, EmptyState } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getRoleConfig } from '@/utils/roles';
import type { User, UserRole } from '@/types';

export default function UsersScreen() {
  const theme = useTheme();
  const { data, isLoading } = useUsers();

  const renderUser = ({ item }: { item: User }) => {
    const roleCfg = getRoleConfig(item.role as UserRole);
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{item.email}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <Badge label={roleCfg.label} color={roleCfg.color} backgroundColor={roleCfg.bg} size="sm" />
          {item.department && (
            <Badge label={item.department} color={theme.textSecondary} backgroundColor={theme.surfaceElevated} size="sm" />
          )}
        </View>
      </Card>
    );
  };

  if (isLoading) return <LoadingState message="Loading users..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Users</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{data?.meta.total || 0} users</Text>
      </View>
      <FlatList
        data={data?.data || []}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No users found" icon="users" />}
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
  card: { gap: Spacing.three },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: FontSize.md, fontWeight: '600' },
  userEmail: { fontSize: FontSize.sm },
  cardMeta: { flexDirection: 'row', gap: Spacing.two },
});
