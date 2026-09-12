import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useCompliance } from '@/hooks/useCompliance';
import { Badge, LoadingState, EmptyState, MockBadge, PngIcon, type PngIconName } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate } from '@/utils/date';
import type { ComplianceRequirement } from '@/types';

const STATUS_ICONS: Record<string, PngIconName> = {
  compliant: 'tick',
  non_compliant: 'alert',
  pending: 'time',
  overdue: 'skull',
};

export default function ComplianceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading } = useCompliance({ status: statusFilter });

  const statusFilters = [
    { key: undefined, label: 'All' },
    { key: 'compliant', label: 'Compliant' },
    { key: 'pending', label: 'Pending' },
    { key: 'non_compliant', label: 'Non-Compliant' },
    { key: 'overdue', label: 'Overdue' },
  ];

  const renderItem = ({ item }: { item: ComplianceRequirement }) => {
    const statusCfg = getStatusConfig(item.status);
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/(tabs)/compliance-detail' as any, params: { id: item.id } })}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { backgroundColor: theme.surfaceElevated },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRowIcon}>
            <PngIcon name={STATUS_ICONS[item.status] ?? 'scale'} size={22} />
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
              {item.requirement}
            </Text>
          </View>
          <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
        </View>
        <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.meta}>
          <Badge label={item.category} color={theme.info} backgroundColor={theme.info + '20'} size="sm" />
          <Text style={[styles.dueDate, { color: theme.textMuted }]}>
            Due: {formatDate(item.dueDate)}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (isLoading) return <LoadingState message="Loading compliance..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Compliance</Text>
          <MockBadge />
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {data?.meta.total || 0} requirements
        </Text>
      </View>

      <View style={styles.filters}>
        {statusFilters.map((f) => (
          <Pressable
            key={f.label}
            onPress={() => setStatusFilter(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: statusFilter === f.key ? theme.primary : theme.surfaceElevated,
                borderColor: statusFilter === f.key ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: statusFilter === f.key ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={data?.data || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No compliance items found" icon="scale" />}
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
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: { fontSize: FontSize.sm, fontWeight: '500' },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.eight,
    gap: Spacing.three,
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
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleRowIcon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  description: { fontSize: FontSize.sm, lineHeight: 18 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  dueDate: { fontSize: FontSize.xs },
});
