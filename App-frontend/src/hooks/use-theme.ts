/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/store/themeStore';
import type { ThemeMode } from '@/store/themeStore';

export function useThemeMode(): ThemeMode {
  const mode = useThemeStore((s) => s.mode);
  const scheme = useColorScheme();
  return mode ?? (scheme === 'dark' ? 'dark' : 'light');
}

export function useTheme() {
  return Colors[useThemeMode()];
}
