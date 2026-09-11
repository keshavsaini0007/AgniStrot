import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { useQueueIncident } from '@/hooks/useIncidents';
import { ChoiceChips, ChoiceOption, Button, Card, PhotoAttachment } from '@/components/ui';
import { LocationCapture } from '@/components/LocationCapture';
import { newClientUuid } from '@/api/offlineQueue';
import { type CaptureLocation } from '@/hooks/useLocation';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

const SEVERITY_OPTIONS: ChoiceOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const CATEGORY_OPTIONS: ChoiceOption[] = [
  { value: 'safety', label: 'Safety' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
];

export default function NewIncidentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const queueIncident = useQueueIncident();

  const clientUuidRef = useRef(newClientUuid());
  const [severity, setSeverity] = useState<string>('medium');
  const [category, setCategory] = useState<string>('safety');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<CaptureLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const siteId = user?.mineId;

  const submit = async () => {
    if (!siteId) {
      setError('Your account has no site assigned. Contact your administrator.');
      return;
    }
    const trimmed = description.trim();
    if (trimmed.length < 10) {
      setDescriptionError('Please describe the incident in at least 10 characters.');
      return;
    }
    setDescriptionError(null);
    setError(null);
    try {
      await queueIncident.mutateAsync({
        clientUuid: clientUuidRef.current,
        siteId,
        severity,
        category,
        description: trimmed,
        location,
        photoUrls: photos,
        capturedAt: new Date().toISOString(),
      });
      Alert.alert('Incident reported', 'Saved to the sync queue and will sync automatically.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the incident.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Severity</Text>
          <ChoiceChips options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Category</Text>
          <ChoiceChips options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
          <RNTextInput
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (descriptionError) setDescriptionError(null);
            }}
            placeholder="What happened, where, who is affected..."
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: descriptionError ? theme.danger : theme.border,
                color: theme.text,
              },
            ]}
          />
          {descriptionError && (
            <Text style={[styles.fieldError, { color: theme.danger }]}>{descriptionError}</Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
          <LocationCapture value={location} onChange={setLocation} />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Photos</Text>
          <PhotoAttachment value={photos} onChange={setPhotos} max={5} />
        </Card>

        {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

        <Button
          title="Report Incident"
          loading={queueIncident.isPending}
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
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.four,
    fontSize: FontSize.md,
    minHeight: 112,
  },
  fieldError: {
    fontSize: FontSize.xs,
  },
  error: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});