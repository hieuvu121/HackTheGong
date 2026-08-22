import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
}

export function Sheet({ children, style }: Props) {
  return (
    <View style={[styles.sheet, shadows.level2, style]}>
      <View style={styles.grabber} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfacePressed,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
});
