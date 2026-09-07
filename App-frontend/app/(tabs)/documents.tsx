import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Card, EmptyState, LoadingState, Badge } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { formatDate } from '@/utils/date';
import type { Document } from '@/types';

const mockDocuments: Document[] = [
  { id: 'doc-001', name: 'Safety Certificate 2026', category: 'Certificate', mineId: 'mine-001', uploadedBy: 'usr-001', fileUrl: '', fileType: 'application/pdf', fileSize: 245000, status: 'active', createdAt: '2026-03-15T10:00:00Z' },
  { id: 'doc-002', name: 'Environmental Clearance', category: 'Clearance', mineId: 'mine-001', uploadedBy: 'usr-002', fileUrl: '', fileType: 'application/pdf', fileSize: 180000, status: 'active', createdAt: '2026-04-20T14:00:00Z' },
  { id: 'doc-003', name: 'Inspection Report - Aug', category: 'Report', mineId: 'mine-002', uploadedBy: 'usr-003', fileUrl: '', fileType: 'application/pdf', fileSize: 320000, status: 'active', createdAt: '2026-08-20T09:00:00Z' },
];

export default function DocumentsScreen() {
  const theme = useTheme();

  const renderDocument = ({ item }: { item: Document }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.docName, { color: theme.text }]} numberOfLines={1}>📄 {item.name}</Text>
        <Badge label={item.category} color={theme.info} backgroundColor={theme.info + '20'} size="sm" />
      </View>
      <Text style={[styles.docMeta, { color: theme.textSecondary }]}>
        {(item.fileSize / 1000).toFixed(0)} KB • {formatDate(item.createdAt)}
      </Text>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Documents</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{mockDocuments.length} files</Text>
      </View>
      <FlatList
        data={mockDocuments}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No documents" icon="📄" />}
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
  docName: { fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  docMeta: { fontSize: FontSize.xs },
});
