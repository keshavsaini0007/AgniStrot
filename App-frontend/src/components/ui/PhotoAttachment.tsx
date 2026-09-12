import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { PngIcon } from './PngIcon';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { pickPhotos } from '@/utils/media';
import { mediaService } from '@/services/mediaService';

interface PhotoAttachmentProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export function PhotoAttachment({ value, onChange, max = 5 }: PhotoAttachmentProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPhotos = async () => {
    setError(null);
    setBusy(true);
    try {
      const photos = await pickPhotos(max - value.length);
      if (photos.length === 0) return;
      const urls: string[] = [];
      for (const photo of photos) {
        const url = await mediaService.upload({
          uri: photo.uri,
          name: photo.name,
          type: photo.type,
        });
        urls.push(url);
      }
      onChange([...value, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not attach photo.');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (url: string) => onChange(value.filter((v) => v !== url));
  const reachMax = value.length >= max;

  return (
    <View style={styles.wrap}>
      {value.length > 0 && (
        <View style={styles.grid}>
          {value.map((url) => (
            <View key={url} style={styles.thumbWrap}>
              <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" />
              <Pressable style={styles.remove} onPress={() => removePhoto(url)} hitSlop={8}>
                <PngIcon name="trash-can" size={16} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <Pressable
        onPress={addPhotos}
        disabled={busy || reachMax}
        style={[
          styles.addButton,
          { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
          (busy || reachMax) && { opacity: 0.5 },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={theme.primary} size="small" />
        ) : (
          <>
            <PngIcon name="camera" size={18} />
            <Text style={[styles.addText, { color: theme.textSecondary }]}>
              {reachMax ? `Max ${max} photos` : `Add photo${value.length ? ` (${value.length}/${max})` : ''}`}
            </Text>
          </>
        )}
      </Pressable>
      {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BorderRadius.full,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.three,
  },
  addText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  error: {
    fontSize: FontSize.xs,
  },
});