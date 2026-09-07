import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { Badge } from './Badge';
import { formatDate } from '@/utils/date';

interface ListItemProps {
  title: string;
  subtitle?: string;
  status?: string;
  badge?: string;
  badgeColor?: string;
  date?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export function ListItem({ title, subtitle, status, badge, badgeColor, date, onPress, rightElement }: ListItemProps) {
  const theme = useTheme();
  const statusConfig = status ? getStatusConfig(status) : null;

  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        pressed && onPress && { backgroundColor: theme.surfaceElevated },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {statusConfig && (
            <Badge
              label={statusConfig.label}
              color={statusConfig.color}
              backgroundColor={statusConfig.bg}
              size="sm"
            />
          )}
        </View>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
        <View style={styles.footer}>
          {date && (
            <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(date)}</Text>
          )}
          {badge && (
            <Badge label={badge} color={badgeColor || theme.primary} backgroundColor={(badgeColor || theme.primary) + '20'} size="sm" />
          )}
        </View>
      </View>
      {rightElement}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  subtitle: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  date: {
    fontSize: FontSize.xs,
  },
});
