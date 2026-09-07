import React from 'react';
import { View, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { BorderRadius, Spacing } from '@/constants/theme';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: number;
  gap?: number;
}

export function Card({ children, style, variant = 'default', padding = Spacing.four, gap = Spacing.three, ...props }: CardProps) {
  const theme = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.surfaceElevated,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 4,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.border,
        };
      default:
        return {
          backgroundColor: theme.surface,
        };
    }
  };

  return (
    <View
      style={[
        {
          borderRadius: BorderRadius.lg,
          padding,
          gap,
          ...getVariantStyle(),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
