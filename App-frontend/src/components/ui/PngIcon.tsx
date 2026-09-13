import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { PNG_ICONS, type PngIconName } from './pngIcons';

export type { PngIconName } from './pngIcons';

interface PngIconProps {
  name: PngIconName;
  size?: number;
  flip?: boolean;
}

export const PNG_ICON_SCALE = 1.5;

export function PngIcon({ name, size = 20, flip = false }: PngIconProps) {
  const scaledSize = size * PNG_ICON_SCALE;
  return (
    <Image
      source={PNG_ICONS[name]}
      style={[styles.icon, { width: scaledSize, height: scaledSize }, flip && styles.flip]}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  icon: {},
  flip: {
    transform: [{ scaleX: -1 }],
  },
});