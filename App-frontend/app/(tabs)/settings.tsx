import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
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

  type SettingItem = { label: string; value?: string; toggle?: boolean; defaultValue?: boolean; badge?: boolean };

  const settingSections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Account',
      items: [
        { label: 'Name', value: user?.name || 'User' },
        { label: 'Email', value: user?.email || '' },
        { label: 'Role', value: roleConfig?.label || '', badge: true },
        { label: 'Department', value: user?.department || 'N/A' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { label: 'Push Notifications', toggle: true, defaultValue: true },
        { label: 'Email Notifications', toggle: true, defaultValue: false },
        { label: 'Dark Mode', toggle: true, defaultValue: true },
      ],
    },
    {
      title: 'About',
      items: [
        { label: 'Version', value: '1.0.0' },
        { label: 'Build', value: '2026.08' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

        {settingSections.map((section, sIdx) => (
          <Card key={sIdx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{section.title}</Text>
            {section.items.map((item, iIdx) => (
              <View
                key={iIdx}
                style={[styles.settingRow, { borderBottomColor: theme.border }, iIdx < section.items.length - 1 && { borderBottomWidth: 1 }]}
              >
                <Text style={[styles.settingLabel, { color: theme.text }]}>{item.label}</Text>
                {item.toggle ? (
                  <Switch
                    value={item.defaultValue}
                    trackColor={{ false: theme.surfaceElevated, true: theme.primary + '80' }}
                    thumbColor={item.defaultValue ? theme.primary : theme.textMuted}
                  />
                ) : item.badge ? (
                  <Badge label={item.value || ''} color={theme.primary} backgroundColor={theme.primary + '20'} size="sm" />
                ) : (
                  <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{item.value}</Text>
                )}
              </View>
            ))}
          </Card>
        ))}
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
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.three, borderBottomWidth: 1 },
  settingLabel: { fontSize: FontSize.md, fontWeight: '500' },
  settingValue: { fontSize: FontSize.md },
});
