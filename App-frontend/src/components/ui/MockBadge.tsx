import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Badge } from './Badge';

export function MockBadge() {
  const theme = useTheme();
  return <Badge label="MOCK" color={theme.textMuted} backgroundColor={theme.surfaceElevated} size="sm" />;
}