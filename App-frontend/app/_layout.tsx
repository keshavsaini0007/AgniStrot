import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { applyApiUrl } from '@/api/client';
import { getApiUrlOverride } from '@/api/apiUrl';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThemeMode } from '@/hooks/use-theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function AuthGate() {
  const { isAuthenticated, isLoading, fetchCurrentUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const themeMode = useThemeMode();

  useEffect(() => {
    (async () => {
      const override = await getApiUrlOverride();
      if (override) applyApiUrl(override);
      await fetchCurrentUser();
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (segments[0] === '(auth)') {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: themeMode === 'dark' ? '#0B0D0E' : '#F8F9FA' }]}>
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#D88A32" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Slot />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
