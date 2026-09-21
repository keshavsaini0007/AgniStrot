import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { Spacing } from '@/constants/theme';

export function AppNavbar() {
  const theme = useTheme();

  return (
    <View style={[styles.navbar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Image source={require('../assets/logo.png')} style={styles.logo} contentFit="contain" />
      <ThemeToggleButton />
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
  },
  logo: {
    width: 57,
    height: 40,
  },
});