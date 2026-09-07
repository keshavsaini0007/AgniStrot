import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useMines } from '@/hooks/useMines';
import { Card, EmptyState, LoadingState } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

export default function GISScreen() {
  const theme = useTheme();
  const { data, isLoading } = useMines();

  if (isLoading) return <LoadingState message="Loading map..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>GIS Intelligence</Text>
      </View>
      <Card style={styles.mapPlaceholder}>
        <Text style={[styles.mapIcon, { color: theme.textMuted }]}>🗺️</Text>
        <Text style={[styles.mapText, { color: theme.textSecondary }]}>Mine Locations Map</Text>
        <Text style={[styles.mapSubtext, { color: theme.textMuted }]}>
          {data?.meta.total || 0} mines across Jharkhand
        </Text>
        <View style={styles.mineList}>
          {data?.data?.map((mine) => (
            <View key={mine.id} style={[styles.mineRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.mineName, { color: theme.text }]}>{mine.name}</Text>
              <Text style={[styles.mineCoords, { color: theme.textMuted }]}>
                {mine.location.latitude.toFixed(4)}, {mine.location.longitude.toFixed(4)}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  mapPlaceholder: { flex: 1, margin: Spacing.four, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  mapIcon: { fontSize: 64 },
  mapText: { fontSize: FontSize.lg, fontWeight: '600' },
  mapSubtext: { fontSize: FontSize.sm },
  mineList: { width: '100%', marginTop: Spacing.four },
  mineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: 1 },
  mineName: { fontSize: FontSize.md, fontWeight: '500' },
  mineCoords: { fontSize: FontSize.xs },
});
