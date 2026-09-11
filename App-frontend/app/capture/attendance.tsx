import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { useQueueAttendance } from '@/hooks/useAttendance';
import { ChoiceChips, ChoiceOption, Button, Card, TextInput } from '@/components/ui';
import { LocationCapture } from '@/components/LocationCapture';
import { newClientUuid } from '@/api/offlineQueue';
import { type CaptureLocation } from '@/hooks/useLocation';
import { FontSize, Spacing } from '@/constants/theme';

const CHECK_TYPES: ChoiceOption[] = [
  { value: 'in', label: 'Check-in' },
  { value: 'out', label: 'Check-out' },
];

export default function AttendanceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const queueAttendance = useQueueAttendance();

  const clientUuidRef = useRef(newClientUuid());
  const [checkType, setCheckType] = useState<string>('in');
  const [workerRef, setWorkerRef] = useState('');
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [location, setLocation] = useState<CaptureLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const siteId = user?.mineId;

  const submit = async () => {
    if (!siteId) {
      setError('Your account has no site assigned. Contact your administrator.');
      return;
    }
    const ref = workerRef.trim();
    if (!ref) {
      setWorkerError('Enter the worker token to check in or out.');
      return;
    }
    setWorkerError(null);
    setError(null);
    try {
      await queueAttendance.mutateAsync({
        clientUuid: clientUuidRef.current,
        siteId,
        workerRef: ref,
        checkType,
        location,
        capturedAt: new Date().toISOString(),
      });
      Alert.alert(
        'Attendance recorded',
        `${checkType === 'in' ? 'Check-in' : 'Check-out'} saved to the sync queue.`
      );
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record attendance.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Check Type</Text>
          <ChoiceChips options={CHECK_TYPES} value={checkType} onChange={setCheckType} />
        </Card>

        <Card style={styles.section}>
          <TextInput
            label={checkType === 'in' ? 'Worker token (check-in)' : 'Worker token (check-out)'}
            value={workerRef}
            onChangeText={(text) => {
              setWorkerRef(text);
              if (workerError) setWorkerError(null);
            }}
            error={workerError ?? undefined}
            placeholder="e.g. WB-0021"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
          <LocationCapture value={location} onChange={setLocation} />
        </Card>

        {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

        <Button
          title={checkType === 'in' ? 'Check In' : 'Check Out'}
          loading={queueAttendance.isPending}
          disabled={!siteId}
          onPress={submit}
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
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  error: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});