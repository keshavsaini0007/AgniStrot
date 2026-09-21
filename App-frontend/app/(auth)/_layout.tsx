import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useThemeMode } from '@/hooks/use-theme';

export default function AuthLayout() {
  const colors = Colors[useThemeMode()];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
