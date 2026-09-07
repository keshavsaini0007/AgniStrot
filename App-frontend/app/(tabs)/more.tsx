import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { Card, Badge, Button } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getRoleConfig } from '@/utils/roles';

export default function MoreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const roleConfig = user ? getRoleConfig(user.role) : null;

  const menuItems = [
    { icon: '🚨', title: 'Corrective Actions', screen: '/(tabs)/corrective-actions' as const },
    { icon: '📋', title: 'Compliance', screen: '/(tabs)/compliance' as const },
    { icon: '🔔', title: 'Notifications', screen: '/(tabs)/notifications' as const },
    { icon: '📄', title: 'Documents', screen: '/(tabs)/documents' as const },
    { icon: '📊', title: 'Analytics', screen: '/(tabs)/analytics' as const },
    { icon: '🗺️', title: 'GIS Map', screen: '/(tabs)/gis' as const },
    { icon: '📈', title: 'Reports', screen: '/(tabs)/reports' as const },
    { icon: '👥', title: 'Users', screen: '/(tabs)/users' as const },
    { icon: '📝', title: 'Audit Logs', screen: '/(tabs)/audit-logs' as const },
    { icon: '⚙️', title: 'Settings', screen: '/(tabs)/settings' as const },
  ];

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
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.menuArrow, { color: theme.textMuted }]}>›</Text>
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
  menuIcon: { fontSize: 20 },
  menuTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '500' },
  menuArrow: { fontSize: 24, fontWeight: '300' },
  logoutButton: { marginTop: Spacing.two },
});
