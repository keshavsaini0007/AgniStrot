import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { Button, TextInput, Card } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { applyApiUrl, getApiBaseUrl } from '@/api/client';
import { getApiUrlOverride, setApiUrlOverride } from '@/api/apiUrl';

export default function LoginScreen() {
  const theme = useTheme();
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showServer, setShowServer] = useState(false);
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
    setTimeout(() => setApiSaved(false), 2500);
  };

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
            <Image source={require('../../src/assets/logo.png')} style={styles.logo} contentFit="contain" />
            {/* <Text style={[styles.title, { color: theme.text }]}>Smart Mine</Text> */}
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
              <View style={styles.errorBox}>
                <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
                <Text style={[styles.errorUrl, { color: theme.textMuted }]}>
                  Tried: {getApiBaseUrl()}
                </Text>
              </View>
            )}

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              disabled={!email || !password}
              style={styles.loginButton}
            />

            <View style={styles.demoSection}>
              <Text style={[styles.demoTitle, { color: theme.textMuted }]}>Field Officer Login</Text>
              <View style={styles.demoAccounts}>
                <Button
                  title="Rahul Kumar (Field Officer)"
                  variant="ghost"
                  size="sm"
                  onPress={() => { setEmail('rahul@agnistrot.com'); setPassword('password123'); }}
                />
              </View>
            </View>

            <View style={styles.demoSection}>
              <Text style={[styles.demoTitle, { color: theme.textMuted }]}>API Server</Text>
              <Button
                title={showServer ? 'Hide server settings' : `Server: ${apiUrl || 'set…'}`}
                variant="ghost"
                size="sm"
                onPress={() => { setShowServer((v) => !v); setApiSaved(false); }}
              />
              {showServer && (
                <View style={styles.serverBox}>
                  <TextInput
                    label="API Base URL"
                    value={apiUrl}
                    onChangeText={setApiUrl}
                    placeholder="https://xxxx.loca.lt/api/v1"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                  <Button title="Save API URL" size="sm" onPress={saveApiUrl} />
                  {apiSaved && (
                    <Text style={[styles.serverSaved, { color: theme.primary }]}>
                      API URL saved. It persists across reloads.
                    </Text>
                  )}
                </View>
              )}
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
    width: 160,
    height: 112,
    marginBottom: Spacing.two,
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
  errorBox: {
    width: '100%',
    gap: Spacing.one,
  },
  errorUrl: {
    fontSize: FontSize.xs,
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
  serverBox: {
    width: '100%',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  serverSaved: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
