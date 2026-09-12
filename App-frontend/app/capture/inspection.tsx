import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { useCreateInspection } from '@/hooks/useInspections';
import { ChoiceChips, ChoiceOption, Button, Card, PhotoAttachment, PngIcon } from '@/components/ui';
import { LocationCapture } from '@/components/LocationCapture';
import { newClientUuid } from '@/api/offlineQueue';
import { type CaptureLocation } from '@/hooks/useLocation';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

const INSPECTION_TYPES: ChoiceOption[] = [
  { value: 'safety', label: 'Safety' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'production', label: 'Production' },
  { value: 'labour', label: 'Labour' },
];

const RESULT_OPTIONS: ChoiceOption[] = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'na', label: 'N/A' },
];

const CHECKLIST_ITEMS: string[] = [
  'PPE compliance on site',
  'Barricading around active excavation',
  'First aid kit availability & expiry',
  'Fire extinguisher inspection & pressure',
  'Dust suppression system operational',
];

type CheckResult = 'pass' | 'fail' | 'na';

export default function NewInspectionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const createInspection = useCreateInspection();

  const clientUuidRef = useRef(newClientUuid());
  const [type, setType] = useState<string>('safety');
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<CaptureLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const siteId = user?.mineId;

  const setResult = (item: string, value: string) => {
    setResults((prev) => ({ ...prev, [item]: value as CheckResult }));
  };

  const submit = async () => {
    if (!siteId) {
      setError('Your account has no site assigned. Contact your administrator.');
      return;
    }
    setError(null);
    const checklist = CHECKLIST_ITEMS.map((item) => ({
      item,
      result: results[item] ?? 'pass',
      notes: notes.trim() || undefined,
    }));
    try {
      await createInspection.mutateAsync({
        clientUuid: clientUuidRef.current,
        siteId,
        type,
        checklist,
        location,
        photoUrls: photos,
        scheduledAt: new Date().toISOString(),
      });
      Alert.alert('Inspection saved', 'Saved to the sync queue and will sync automatically.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the inspection.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <PngIcon name="hard-hat" size={16} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Inspection Type</Text>
          </View>
          <ChoiceChips options={INSPECTION_TYPES} value={type} onChange={setType} />
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <PngIcon name="notebook" size={16} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Checklist</Text>
          </View>
          {CHECKLIST_ITEMS.map((item) => (
            <View key={item} style={styles.checkRow}>
              <Text style={[styles.checkText, { color: theme.text }]}>{item}</Text>
              <ChoiceChips
                size="sm"
                options={RESULT_OPTIONS}
                value={results[item] ?? 'pass'}
                onChange={(value) => setResult(item, value)}
              />
            </View>
          ))}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <PngIcon name="file-text" size={16} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes (optional)</Text>
          </View>
          <TextInputNotes value={notes} onChangeText={setNotes} />
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <PngIcon name="map-pin" size={16} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
          </View>
          <LocationCapture value={location} onChange={setLocation} />
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <PngIcon name="camera" size={18} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Photos</Text>
          </View>
          <PhotoAttachment value={photos} onChange={setPhotos} max={5} />
        </Card>

        {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

        <Button
          title="Save Inspection"
          loading={createInspection.isPending}
          disabled={!siteId}
          onPress={submit}
        />

        {!siteId && (
          <Text style={[styles.noSite, { color: theme.textMuted }]}>
            A site must be assigned to your account before capturing inspections.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TextInputNotes({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  const theme = useTheme();
  return (
    <RNTextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Add any observations, hazards or follow-ups..."
      placeholderTextColor={theme.textMuted}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
      style={[
        styles.notesInput,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          color: theme.text,
        },
      ]}
    />
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  checkRow: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  checkText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.four,
    fontSize: FontSize.md,
    minHeight: 96,
  },
  error: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  noSite: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});