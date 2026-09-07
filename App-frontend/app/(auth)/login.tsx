import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { Button, TextInput, Card } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const theme = useTheme();
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    try {
      await login({ email, password });
    } catch (err) {
      // Error is handled by auth store
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[styles.logo, { backgroundColor: theme.primary }]}>
              <Text style={styles.logoText}>SM</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Smart Mine</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Governance & Compliance System
            </Text>
          </View>

          <Card variant="elevated" style={styles.formCard}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Sign In</Text>
            <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
              Enter your credentials to continue
            </Text>

            <TextInput
              label="Email"
              value={email}
              onChangeText={(text) => { setEmail(text); clearError(); }}
              placeholder="you@coalindia.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => { setPassword(text); clearError(); }}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
            />

            {error && (
              <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
            )}

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              disabled={!email || !password}
              style={styles.loginButton}
            />

            <View style={styles.demoSection}>
              <Text style={[styles.demoTitle, { color: theme.textMuted }]}>Demo Accounts</Text>
              <View style={styles.demoAccounts}>
                {[
                  { email: 'rahul@coalindia.com', role: 'Mine Officer' },
                  { email: 'priya@coalindia.com', role: 'Corporate' },
                  { email: 'amit@coalindia.com', role: 'Inspector' },
                  { email: 'admin@coalindia.com', role: 'Admin' },
                ].map((account) => (
                  <Button
                    key={account.email}
                    title={account.role}
                    variant="ghost"
                    size="sm"
                    onPress={() => { setEmail(account.email); setPassword('password'); }}
                  />
                ))}
              </View>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.five,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.eight,
    gap: Spacing.two,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FontSize.md,
  },
  formCard: {
    gap: Spacing.four,
  },
  formTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
  },
  formSubtitle: {
    fontSize: FontSize.sm,
    marginTop: -Spacing.two,
  },
  error: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: Spacing.two,
  },
  demoSection: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  demoTitle: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoAccounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.one,
  },
});
