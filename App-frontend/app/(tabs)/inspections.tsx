import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useInspections } from '@/hooks/useInspections';
import { useMines } from '@/hooks/useMines';
import { Badge, LoadingState, EmptyState, PngIcon, Button, type PngIconName } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate } from '@/utils/date';
import type { Inspection } from '@/types';

const TYPE_ICONS: Record<string, PngIconName> = {
  safety: 'shield',
  environmental: 'leaf',
  operational: 'tools',
  statutory: 'scale',
};

export default function InspectionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<string | undefined>();
  const { data, isLoading } = useInspections({ status: filter });
  const { data: minesData } = useMines();

  const getMineName = (mineId: string) => {
    return minesData?.data.find((m) => m.id === mineId)?.name || 'Unknown Mine';
  };

  const filters = [
    { key: undefined, label: 'All' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  const renderInspection = ({ item }: { item: Inspection }) => {
    const statusCfg = getStatusConfig(item.status);
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/(tabs)/inspection-detail' as any, params: { id: item.id } })}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { backgroundColor: theme.surfaceElevated },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.typeRow}>
              <PngIcon name={TYPE_ICONS[item.type] ?? 'hard-hat'} size={16} />
              <Badge label={item.type} color={theme.info} backgroundColor={theme.info + '20'} size="sm" />
            </View>
            <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
          </View>
        </View>
        <View style={styles.metaRow}>
          <PngIcon name="map-pin" size={14} />
          <Text style={[styles.mineName, { color: theme.textSecondary }]}>
            {getMineName(item.mineId)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <PngIcon name="calendar" size={14} />
          <Text style={[styles.date, { color: theme.textMuted }]}>
            {formatDate(item.scheduledAt)}
          </Text>
        </View>
        {item.observationsCount > 0 && (
          <View style={styles.metaRow}>
            <PngIcon name="notebook" size={14} />
            <Text style={[styles.obsCount, { color: theme.primary }]}>
              {item.observationsCount} observation{item.observationsCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (isLoading) return <LoadingState message="Loading inspections..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: Spacing.one }}>
          <Text style={[styles.title, { color: theme.text }]}>Inspections</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {data?.meta.total || 0} inspections
          </Text>
        </View>
        <Button
          title="New"
          size="sm"
          icon={<PngIcon name="plus" size={16} />}
          onPress={() => router.push('/capture/inspection')}
        />
      </View>

      <View style={styles.filters}>
        {filters.map((f) => (
          <Pressable
            key={f.label}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.key ? theme.primary : theme.surfaceElevated,
                borderColor: filter === f.key ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f.key ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={data?.data || []}
        renderItem={renderInspection}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No inspections found" icon="hard-hat" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
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
  cardHeader: {},
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  mineName: { fontSize: FontSize.md, fontWeight: '500' },
  date: { fontSize: FontSize.sm },
  obsCount: { fontSize: FontSize.sm, fontWeight: '500' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
