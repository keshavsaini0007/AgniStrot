import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1D1F',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceElevated: '#F0F1F3',
    border: '#E5E7EB',
    primary: '#D88A32',
    primaryLight: '#F5DEB3',
    primaryDark: '#B8722A',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    ai: '#8B5CF6',
  },
  dark: {
    text: '#F4F5F5',
    textSecondary: '#A4ADB2',
    textMuted: '#8D969B',
    background: '#0B0D0E',
    surface: '#111416',
    surfaceElevated: '#171A1D',
    border: '#252A2D',
    primary: '#D88A32',
    primaryLight: '#E8A84D',
    primaryDark: '#B8722A',
    success: '#35C759',
    warning: '#F5B942',
    danger: '#FF4D4F',
    info: '#4DA3FF',
    ai: '#A78BFA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
  ten: 40,
  twelve: 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  title: 34,
} as const;
