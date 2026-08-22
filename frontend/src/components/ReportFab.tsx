import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, radii, shadows, danger } from '../theme/tokens';
import { type } from '../theme/type';

interface Props {
  onPress: () => void;
  testID?: string;
}

const SIZE = 68;
const HALO = 92;

/**
 * Floating report button. Red is a deliberate exception to DESIGN.md's
 * black-only CTA rule, requested so reporting reads as urgent from the map.
 */
export function ReportFab({ onPress, testID }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.halo} pointerEvents="none" />
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Report a hazard"
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          shadows.level2,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.glyph}>+</Text>
      </Pressable>
      <Text style={[type.bodySmStrong, styles.caption]}>Report</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: radii.full,
    backgroundColor: danger.dangerous.color,
    opacity: 0.16,
    top: -(HALO - SIZE) / 2,
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.full,
    backgroundColor: danger.dangerous.color,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.canvas,
  },
  pressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.88,
  },
  glyph: {
    color: colors.onPrimary,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '500',
  },
  caption: {
    color: colors.ink,
    marginTop: 6,
    backgroundColor: colors.canvas,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
