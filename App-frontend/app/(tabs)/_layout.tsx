import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { PngIcon } from '@/components/ui';
import { SyncMonitor } from '@/components/SyncMonitor';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' || colorScheme === 'unspecified' ? 'dark' : 'light'];

  return (
    <>
      <SyncMonitor />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: () => <PngIcon name="explorer" size={22} />,
        }}
      />
      <Tabs.Screen
        name="mines"
        options={{
          title: 'Mines',
          tabBarIcon: () => <PngIcon name="mine" size={22} />,
        }}
      />
      <Tabs.Screen
        name="inspections"
        options={{
          title: 'Inspect',
          tabBarIcon: () => <PngIcon name="hard-hat" size={22} />,
        }}
      />
      <Tabs.Screen
        name="observations"
        options={{
          title: 'Observe',
          tabBarIcon: () => <PngIcon name="zoom" size={22} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: () => <PngIcon name="bag" size={22} />,
        }}
      />
      {/* Hidden screens - accessible from More */}
      <Tabs.Screen name="corrective-actions" options={{ href: null }} />
      <Tabs.Screen name="compliance" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="gis" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="audit-logs" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      {/* Detail screens */}
      <Tabs.Screen name="mine-detail" options={{ href: null }} />
      <Tabs.Screen name="inspection-detail" options={{ href: null }} />
      <Tabs.Screen name="observation-detail" options={{ href: null }} />
      <Tabs.Screen name="corrective-action-detail" options={{ href: null }} />
      <Tabs.Screen name="compliance-detail" options={{ href: null }} />
    </Tabs>
    </>
  );
}
