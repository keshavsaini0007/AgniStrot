import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useMines } from '@/hooks/useMines';
import { Card, Badge, LoadingState, EmptyState, TextInput, Icon, MockBadge } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import type { Mine } from '@/types';

export default function MinesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useMines({ search: search || undefined });

  const renderMine = ({ item }: { item: Mine }) => {
    const statusCfg = getStatusConfig(item.status);
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/(tabs)/mine-detail' as any, params: { id: item.id } })}
        style={({ pressed }) => [
          styles.mineCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { backgroundColor: theme.surfaceElevated },
        ]}
      >
        <View style={styles.mineHeader}>
          <View style={styles.mineTitleRow}>
            <Text style={[styles.mineName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
          </View>
          <Text style={[styles.mineCode, { color: theme.textMuted }]}>{item.code}</Text>
        </View>

        <View style={styles.mineAddressRow}>
          <Icon name="map-pin" size={14} color={theme.textSecondary} />
          <Text style={[styles.mineAddress, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.location.address}
          </Text>
        </View>

        <View style={styles.mineStats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: item.complianceRate >= 80 ? theme.success : theme.warning }]}>
              {item.complianceRate}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Compliance</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: item.riskScore >= 70 ? theme.danger : item.riskScore >= 40 ? theme.warning : theme.success }]}>
              {item.riskScore}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Risk Score</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {item.openObservations}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Open Issues</Text>
          </View>
        </View>

        {item.overdueActions > 0 && (
          <View style={[styles.overdueBar, { backgroundColor: theme.danger + '15' }]}>
            <Icon name="alert-triangle" size={14} color={theme.danger} />
            <Text style={[styles.overdueText, { color: theme.danger }]}>
              {item.overdueActions} overdue action{item.overdueActions > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (isLoading) return <LoadingState message="Loading mines..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.title, { color: theme.text }]}>Mines</Text>
          <MockBadge />
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {data?.meta.total || 0} mines
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search mines..."
          leftIcon={<Icon name="search" size={18} color={theme.textMuted} />}
        />
      </View>

      <FlatList
        data={data?.data || []}
        renderItem={renderMine}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No mines found" description="Try adjusting your search" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.one,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FontSize.sm,
  },
  searchContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.eight,
    gap: Spacing.three,
  },
  mineCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  mineHeader: {
    gap: Spacing.one,
  },
  mineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mineName: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    flex: 1,
  },
  mineCode: {
    fontSize: FontSize.xs,
  },
  mineAddress: {
    fontSize: FontSize.sm,
  },
  mineStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSize.xs,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  overdueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.sm,
  },
  mineAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
});
