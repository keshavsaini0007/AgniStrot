import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useMines } from '@/hooks/useMines';
import { Card, LoadingState, PngIcon, MockBadge } from '@/components/ui';
import { LocationMap } from '@/components/LocationMap';
import { AppNavbar } from '@/components/AppNavbar';
import { FontSize, Spacing } from '@/constants/theme';

export default function GISScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const { data, isLoading } = useMines();

  if (isLoading) return <LoadingState message="Loading map..." />;

  const mines = data?.data ?? [];
  const points = mines.map((mine) => ({
    key: mine.id,
    latitude: mine.location.latitude,
    longitude: mine.location.longitude,
    title: mine.name,
    description: mine.location.address,
  }));

  const openMine = (id: string) => router.push({ pathname: '/(tabs)/mine-detail' as any, params: { id } });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <AppNavbar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.title, { color: theme.text }]}>GIS Intelligence</Text>
            <MockBadge />
            <PngIcon name="navigation" size={18} />
          </View>
        </View>

        <Card style={styles.mapCard}>
          <LocationMap
            points={points}
            height={Math.min(screenHeight * 0.4, 360)}
            onMarkerPress={(point) => point.key && openMine(point.key)}
          />
          <View style={styles.mapFooter}>
            <Text style={[styles.mapSubtext, { color: theme.textMuted }]}>
              {mines.length} mines across Jharkhand
            </Text>
            {Platform.OS === 'web' && (
              <Text style={[styles.mapSubtext, { color: theme.textMuted }]}>
                Map is supported on mobile. Coordinates listed below.
              </Text>
            )}
          </View>
        </Card>

        <Card style={styles.listCard}>
          <Text style={[styles.listTitle, { color: theme.textSecondary }]}>MINE LOCATIONS</Text>
          {mines.map((mine, index) => (
            <Pressable
              key={mine.id}
              onPress={() => openMine(mine.id)}
              style={[
                styles.mineRow,
                index < mines.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
              ]}
            >
              <PngIcon name="mine" size={18} />
              <View style={styles.mineInfo}>
                <Text style={[styles.mineName, { color: theme.text }]}>{mine.name}</Text>
                <Text style={[styles.mineCoords, { color: theme.textMuted }]}>
                  {mine.location.latitude.toFixed(4)}, {mine.location.longitude.toFixed(4)}
                </Text>
              </View>
              <PngIcon name="right" size={16} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.twelve },
  header: { marginBottom: Spacing.one },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  mapCard: { padding: Spacing.two, gap: Spacing.two },
  mapFooter: { alignItems: 'center', gap: Spacing.one },
  mapSubtext: { fontSize: FontSize.sm },
  listCard: { gap: Spacing.two },
  listTitle: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  mineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  mineInfo: { flex: 1 },
  mineName: { fontSize: FontSize.md, fontWeight: '500' },
  mineCoords: { fontSize: FontSize.xs },
});