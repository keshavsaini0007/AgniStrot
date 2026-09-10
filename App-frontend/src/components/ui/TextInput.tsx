import React from 'react';
import { View, Text, TextInput as RNTextInput, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  style?: ViewStyle;
}

export function TextInput({ label, error, leftIcon, style, ...props }: TextInputProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: error ? theme.danger : theme.border,
          },
          style,
        ]}
      >
        {leftIcon && (
          <View style={styles.iconWrap} pointerEvents="none">
            {leftIcon}
          </View>
        )}
        <RNTextInput
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.textMuted}
          {...props}
        />
      </View>
      {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.four,
    minHeight: 48,
  },
  iconWrap: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.three,
    marginLeft: Spacing.two,
  },
  error: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
