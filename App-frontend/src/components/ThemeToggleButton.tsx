import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemeMode } from '@/hooks/use-theme';
import { useThemeStore } from '@/store/themeStore';
import { Spacing } from '@/constants/theme';

export function ThemeToggleButton() {
  const resolvedMode = useThemeMode();
  const setMode = useThemeStore((s) => s.setMode);

  const isDark = resolvedMode === 'dark';

  return (
    <Pressable
      onPress={() => setMode(isDark ? 'light' : 'dark')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Image
        source={isDark ? require('@/assets/icons/sun.png') : require('@/assets/icons/moon.png')}
        style={styles.icon}
        contentFit="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    width: 24,
    height: 24,
  },
});