import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { applyApiUrl } from '@/api/client';
import { getApiUrlOverride } from '@/api/apiUrl';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  );
}
