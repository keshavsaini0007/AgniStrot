import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { Card, Badge, TextInput, Button, PngIcon } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';
import { getRoleConfig } from '@/utils/roles';
import { applyApiUrl, getApiBaseUrl, defaultApiBaseUrl } from '@/api/client';
import {
  getApiUrlOverride,
  setApiUrlOverride,
  clearApiUrlOverride,
} from '@/api/apiUrl';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const roleConfig = user ? getRoleConfig(user.role) : null;

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [apiUrl, setApiUrl] = useState('');
  const [apiSaved, setApiSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const override = await getApiUrlOverride();
      setApiUrl(override ?? getApiBaseUrl());
    })();
  }, []);

  const saveApiUrl = async () => {
    const trimmed = apiUrl.trim();
    if (!trimmed) return;
    await setApiUrlOverride(trimmed);
    applyApiUrl(trimmed);
    setApiSaved(true);
    setTimeout(() => setApiSaved(false), 2000);
  };

  const resetApiUrl = async () => {
    await clearApiUrlOverride();
    applyApiUrl(defaultApiBaseUrl);
    setApiUrl(getApiBaseUrl());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <PngIcon name="user-check" size={16} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <View style={styles.settingLabelRow}>
              <PngIcon name="user-check" size={16} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Name</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{user?.name || 'User'}</Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <View style={styles.settingLabelRow}>
              <PngIcon name="mail" size={16} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Email</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{user?.email}</Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <View style={styles.settingLabelRow}>
              <PngIcon name="star" size={16} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Role</Text>
            </View>
            {roleConfig && (
              <Badge label={roleConfig.label} color={theme.primary} backgroundColor={theme.primary + '20'} size="sm" />
            )}
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <PngIcon name="briefcase" size={16} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Department</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{user?.department || 'N/A'}</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <PngIcon name="rocket" size={16} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Server</Text>
          </View>
          <View style={styles.apiRow}>
            <TextInput
              label="API Base URL"
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.x.x:5000/api/v1"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>
          <View style={styles.apiButtons}>
            <Button title="Save" size="sm" onPress={saveApiUrl} />
            <Button title="Reset" variant="ghost" size="sm" onPress={resetApiUrl} />
          </View>
          {apiSaved && (
            <Text style={[styles.apiHint, { color: theme.primary }]}>API URL saved. It persists across reloads.</Text>
          )}
          <Text style={[styles.apiHint, { color: theme.textMuted }]}>
            Used for all API calls. Enter the tunneled/exposed backend URL when your phone is not on the same network.
          </Text>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <PngIcon name="setting" size={16} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Preferences</Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <View style={styles.settingLabelRow}>
              <PngIcon name="bell" size={16} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Push Notifications</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: theme.surfaceElevated, true: theme.primary + '80' }}
              thumbColor={pushNotifications ? theme.primary : theme.textMuted}
            />
          </View>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <View style={styles.settingLabelRow}>
              <PngIcon name="mail" size={16} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Email Notifications</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: theme.surfaceElevated, true: theme.primary + '80' }}
              thumbColor={emailNotifications ? theme.primary : theme.textMuted}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <PngIcon name="ghost" size={16} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: theme.surfaceElevated, true: theme.primary + '80' }}
              thumbColor={darkMode ? theme.primary : theme.textMuted}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <PngIcon name="info" size={16} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>About</Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <View style={styles.settingLabelRow}>
              <PngIcon name="help" size={16} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Version</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <PngIcon name="rocket" size={16} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Build</Text>
            </View>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.three },
  settingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  settingLabel: { fontSize: FontSize.md, fontWeight: '500' },
  settingValue: { fontSize: FontSize.md },
  apiRow: { paddingVertical: Spacing.two },
  apiButtons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  apiHint: { fontSize: FontSize.xs, marginTop: Spacing.two, lineHeight: 16 },
});
