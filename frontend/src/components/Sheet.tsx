import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
}

export function Sheet({ children, style }: Props) {
  return (
    <View style={[styles.sheet, shadows.level2, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    // No grab handle: nothing here is draggable, and the affordance is the
    // first thing a thumb tries.
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
