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

export function PngIcon({ name, size = 20, flip = false }: PngIconProps) {
  return (
    <Image
      source={PNG_ICONS[name]}
      style={[styles.icon, { width: size, height: size }, flip && styles.flip]}
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