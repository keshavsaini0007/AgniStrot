import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function CaptureLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="inspection" options={{ title: 'New Inspection' }} />
      <Stack.Screen name="incident" options={{ title: 'Report Incident' }} />
      <Stack.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Stack.Screen name="sync" options={{ title: 'Sync & Offline' }} />
    </Stack>
  );
}