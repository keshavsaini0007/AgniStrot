import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const theme = useTheme();

  const getVariantStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          container: { backgroundColor: theme.surfaceElevated, borderWidth: 1, borderColor: theme.border },
          text: { color: theme.text },
        };
      case 'danger':
        return { container: { backgroundColor: theme.danger }, text: { color: '#FFFFFF' } };
      case 'ghost':
        return { container: { backgroundColor: 'transparent' }, text: { color: theme.primary } };
      default:
        return { container: { backgroundColor: theme.primary }, text: { color: '#FFFFFF' } };
    }
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return { container: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three }, text: { fontSize: FontSize.sm } };
      case 'lg':
        return { container: { paddingVertical: Spacing.four, paddingHorizontal: Spacing.six }, text: { fontSize: FontSize.lg } };
      default:
        return { container: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.five }, text: { fontSize: FontSize.md } };
    }
  };

  const variantStyle = getVariantStyle();
  const sizeStyle = getSizeStyle();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variantStyle.container,
        sizeStyle.container,
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, variantStyle.text, sizeStyle.text]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    gap: Spacing.two,
  },
  text: {
    fontWeight: '600',
  },
});
