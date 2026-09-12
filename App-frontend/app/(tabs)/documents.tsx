import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useDocuments } from '@/hooks/useDocuments';
import { Card, Badge, LoadingState, EmptyState, PngIcon, MockBadge, type PngIconName } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';
import { formatDate } from '@/utils/date';
import type { Document } from '@/types';

const getFileIcon = (fileType: string): PngIconName => {
  const t = fileType.toLowerCase();
  if (t.includes('pdf')) return 'file-pdf';
  if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) return 'file-image';
  if (t.includes('zip') || t.includes('archive') || t.includes('rar')) return 'file-archive';
  if (t.includes('sheet') || t.includes('excel') || t.includes('xls') || t.includes('chart') || t.includes('csv')) return 'file-pie-chart';
  return 'file-text';
};

export default function DocumentsScreen() {
  const theme = useTheme();
  const { data, isLoading } = useDocuments();

  const renderDocument = ({ item }: { item: Document }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.docNameRow}>
          <PngIcon name={getFileIcon(item.fileType)} size={18} />
          <Text style={[styles.docName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
        </View>
        <Badge label={item.category} color={theme.info} backgroundColor={theme.info + '20'} size="sm" />
      </View>
      <Text style={[styles.docMeta, { color: theme.textSecondary }]}>
        {(item.fileSize / 1000).toFixed(0)} KB • {formatDate(item.createdAt)}
      </Text>
    </Card>
  );

  if (isLoading) return <LoadingState message="Loading documents..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.title, { color: theme.text }]}>Documents</Text>
          <MockBadge />
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{data?.meta.total || 0} files</Text>
      </View>
      <FlatList
        data={data?.data || []}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No documents" icon="file-text" />}
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
  docNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 },
  docName: { fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  docMeta: { fontSize: FontSize.xs },
});
