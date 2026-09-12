import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentLocation, type CaptureLocation } from '@/hooks/useLocation';
import { PngIcon, Button } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';

interface LocationCaptureProps {
  value: CaptureLocation | null;
  onChange: (location: CaptureLocation | null) => void;
}

export function LocationCapture({ value, onChange }: LocationCaptureProps) {
  const theme = useTheme();
  const { location, loading, error, getPosition, clearLocation } = useCurrentLocation();
  const captured = value ?? location;

  const attach = async () => {
    const loc = await getPosition();
    if (loc) onChange(loc);
  };

  const remove = () => {
    clearLocation();
    onChange(null);
  };

  return (
    <View style={styles.wrap}>
      <Button
        title={captured ? 'Update location' : 'Attach current location'}
        variant="secondary"
        size="sm"
        loading={loading}
        icon={<PngIcon name="map-pin" size={16} />}
        onPress={attach}
        style={styles.button}
      />
      {error && <Text style={[styles.text, { color: theme.danger }]}>{error}</Text>}
      {captured && !error && (
        <View style={styles.captured}>
          <Text style={[styles.text, { color: theme.textSecondary }]}>
            {captured.latitude.toFixed(5)}, {captured.longitude.toFixed(5)}
          </Text>
          <Pressable onPress={remove} hitSlop={8}>
            <PngIcon name="trash-can" size={16} />
          </Pressable>
        </View>
      )}
      {!captured && !error && (
        <Text style={[styles.text, { color: theme.textMuted }]}>
          Optional. Included on the record when available.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  button: {
    alignSelf: 'flex-start',
  },
  captured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  text: {
    fontSize: FontSize.sm,
  },
});