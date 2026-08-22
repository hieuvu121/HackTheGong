import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';

interface Props {
  children: ReactNode;
  tinted?: boolean;
  elevated?: boolean;
  style?: ViewStyle;
}

export function Card({ children, tinted, elevated, style }: Props) {
  return (
    <View
      style={[
        styles.card,
        tinted && { backgroundColor: colors.canvasSoft },
        elevated && shadows.level1,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.canvas, borderRadius: radii.xl, padding: spacing.xxl },
});
