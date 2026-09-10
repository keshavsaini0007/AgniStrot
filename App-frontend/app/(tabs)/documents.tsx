import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useDocuments } from '@/hooks/useDocuments';
import { Card, Badge, LoadingState, EmptyState, Icon } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { formatDate } from '@/utils/date';
import type { Document } from '@/types';

export default function DocumentsScreen() {
  const theme = useTheme();
  const { data, isLoading } = useDocuments();

  const renderDocument = ({ item }: { item: Document }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.docNameRow}>
          <Icon name="file-text" size={16} color={theme.text} />
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
        <Text style={[styles.title, { color: theme.text }]}>Documents</Text>
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
