import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { Card, Badge, Button, Icon, type IconName } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getRoleConfig } from '@/utils/roles';

export default function MoreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const roleConfig = user ? getRoleConfig(user.role) : null;

  const menuItems = [
    { icon: 'siren', title: 'Corrective Actions', screen: '/(tabs)/corrective-actions' as const },
    { icon: 'clipboard-list', title: 'Compliance', screen: '/(tabs)/compliance' as const },
    { icon: 'bell', title: 'Notifications', screen: '/(tabs)/notifications' as const },
    { icon: 'file-text', title: 'Documents', screen: '/(tabs)/documents' as const },
    { icon: 'bar-chart-3', title: 'Analytics', screen: '/(tabs)/analytics' as const },
    { icon: 'map', title: 'GIS Map', screen: '/(tabs)/gis' as const },
    { icon: 'trending-up', title: 'Reports', screen: '/(tabs)/reports' as const },
    { icon: 'settings', title: 'Settings', screen: '/(tabs)/settings' as const },
  ] satisfies { icon: IconName; title: string; screen: string }[];

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
              <Icon name={item.icon} size={20} color={theme.textMuted} />
              <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
              <Icon name="chevron-right" size={18} color={theme.textMuted} />
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
