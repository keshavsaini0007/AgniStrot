import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { Card, Badge } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getRoleConfig } from '@/utils/roles';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const roleConfig = user ? getRoleConfig(user.role) : null;

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</Text>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Name</Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{user?.name || 'User'}</Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Email</Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{user?.email}</Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Role</Text>
            {roleConfig && (
              <Badge label={roleConfig.label} color={theme.primary} backgroundColor={theme.primary + '20'} size="sm" />
            )}
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Department</Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{user?.department || 'N/A'}</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Preferences</Text>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Push Notifications</Text>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: theme.surfaceElevated, true: theme.primary + '80' }}
              thumbColor={pushNotifications ? theme.primary : theme.textMuted}
            />
          </View>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Email Notifications</Text>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: theme.surfaceElevated, true: theme.primary + '80' }}
              thumbColor={emailNotifications ? theme.primary : theme.textMuted}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: theme.surfaceElevated, true: theme.primary + '80' }}
              thumbColor={darkMode ? theme.primary : theme.textMuted}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>About</Text>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Version</Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Build</Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>2026.09</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.twelve },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  section: { gap: Spacing.one },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.one },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.three },
  settingLabel: { fontSize: FontSize.md, fontWeight: '500' },
  settingValue: { fontSize: FontSize.md },
});
