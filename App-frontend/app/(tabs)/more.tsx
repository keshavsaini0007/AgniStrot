import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { Card, Badge, Button, PngIcon, type PngIconName } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';
import { getRoleConfig } from '@/utils/roles';

export default function MoreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const roleConfig = user ? getRoleConfig(user.role) : null;

  const baseMenuItems = [
    { icon: 'sync', title: 'Sync & Offline', screen: '/capture/sync' },
    { icon: 'inspection', title: 'New Inspection', screen: '/capture/inspection' },
    { icon: 'report-incident', title: 'Report Incident', screen: '/capture/incident' },
    { icon: 'attendance', title: 'Attendance', screen: '/capture/attendance' },
    { icon: 'wrench', title: 'Corrective Actions', screen: '/(tabs)/corrective-actions' },
    { icon: 'compliance', title: 'Compliance', screen: '/(tabs)/compliance' },
    { icon: 'notification', title: 'Notifications', screen: '/(tabs)/notifications' },
    { icon: 'file-text', title: 'Documents', screen: '/(tabs)/documents' },
    { icon: 'analytics', title: 'Analytics', screen: '/(tabs)/analytics' },
    { icon: 'map', title: 'GIS Map', screen: '/(tabs)/gis' },
    { icon: 'map-pin', title: 'My Live Location', screen: '/(tabs)/live-location' },
    { icon: 'report', title: 'Reports', screen: '/(tabs)/reports' },
    { icon: 'setting', title: 'Settings', screen: '/(tabs)/settings' },
  ] as const satisfies readonly { icon: PngIconName; title: string; screen: string }[];

  // Feature 07 parity — the user directory is corporate-only (route guard).
  const corporateEntry = {
    icon: 'user-check',
    title: 'Users',
    screen: '/(tabs)/users',
  } as const;

  const menuItems =
    user?.role === 'corporate_manager'
      ? [...baseMenuItems, corporateEntry]
      : baseMenuItems;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>More</Text>

        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>{user?.name || 'User'}</Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
              {roleConfig && (
                <Badge label={roleConfig.label} color={roleConfig.color} backgroundColor={roleConfig.bg} size="sm" />
              )}
            </View>
          </View>
        </Card>

        <Card style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.screen}
              onPress={() => router.push(item.screen)}
              style={({ pressed }) => [
                styles.menuItem,
                { borderColor: theme.border },
                index < menuItems.length - 1 && { borderBottomWidth: 1 },
                pressed && { backgroundColor: theme.surfaceElevated },
              ]}
            >
              <PngIcon name={item.icon} size={20} />
              <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
              <PngIcon name="right" size={16} />
            </Pressable>
          ))}
        </Card>

        <Button
          title="Sign Out"
          variant="danger"
          onPress={logout}
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.twelve,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  profileCard: {},
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  profileName: { fontSize: FontSize.lg, fontWeight: '600' },
  profileEmail: { fontSize: FontSize.sm },
  menuCard: { padding: 0 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  menuTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '500' },
  logoutButton: { marginTop: Spacing.two },
});
