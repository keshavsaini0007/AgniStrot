import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

export interface ChoiceOption {
  value: string;
  label: string;
}

interface ChoiceChipsProps {
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
}

export function ChoiceChips({ options, value, onChange, size = 'md' }: ChoiceChipsProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              size === 'sm' && styles.chipSm,
              {
                backgroundColor: selected ? theme.primary : theme.surfaceElevated,
                borderColor: selected ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                size === 'sm' && styles.labelSm,
                { color: selected ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipSm: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  labelSm: {
    fontSize: FontSize.xs,
  },
});