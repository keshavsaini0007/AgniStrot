import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useObservations } from '@/hooks/useObservations';
import { Badge, LoadingState, EmptyState } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate } from '@/utils/date';
import type { Observation } from '@/types';

export default function ObservationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const { data, isLoading } = useObservations({ severity: severityFilter });

  const severityFilters = [
    { key: undefined, label: 'All', color: theme.textSecondary },
    { key: 'critical', label: 'Critical', color: theme.danger },
    { key: 'high', label: 'High', color: '#FF8C42' },
    { key: 'medium', label: 'Medium', color: theme.warning },
    { key: 'low', label: 'Low', color: theme.success },
  ];

  const renderObservation = ({ item }: { item: Observation }) => {
    const severityCfg = getStatusConfig(item.severity);
    const statusCfg = getStatusConfig(item.status);
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/(tabs)/observation-detail' as any, params: { id: item.id } })}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { backgroundColor: theme.surfaceElevated },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.badges}>
            <Badge label={severityCfg.label} color={severityCfg.color} backgroundColor={severityCfg.bg} size="sm" />
            <Badge label={statusCfg.label} color={statusCfg.color} backgroundColor={statusCfg.bg} size="sm" />
          </View>
        </View>
        <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.meta}>
          <Badge label={item.category} color={theme.ai} backgroundColor={theme.ai + '20'} size="sm" />
          <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(item.createdAt)}</Text>
        </View>
      </Pressable>
    );
  };

  if (isLoading) return <LoadingState message="Loading observations..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Observations</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {data?.meta.total || 0} observations
        </Text>
      </View>

      <View style={styles.filters}>
        {severityFilters.map((f) => (
          <Pressable
            key={f.label}
            onPress={() => setSeverityFilter(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: severityFilter === f.key ? f.color : theme.surfaceElevated,
                borderColor: severityFilter === f.key ? f.color : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: severityFilter === f.key ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={data?.data || []}
        renderItem={renderObservation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No observations found" />}
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
  badges: { flexDirection: 'row', gap: Spacing.one },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  description: { fontSize: FontSize.sm, lineHeight: 18 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  date: { fontSize: FontSize.xs },
});
