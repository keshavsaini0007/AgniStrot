import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'clipboard-list', title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon name={icon} size={48} color={theme.textMuted} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]}
          onPress={onAction}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.eight,
    gap: Spacing.three,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.two,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
