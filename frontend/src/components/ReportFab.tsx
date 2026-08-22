import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { RadarPing } from './RadarPing';
import { colors, radii, shadows } from '../theme/tokens';
import { type } from '../theme/type';

interface Props {
  onPress: () => void;
  testID?: string;
}

const SIZE = 60;
const HALO = 78;

/**
 * Floating report button.
 *
 * Black, not red: red is the hazard language, and a compose button pulsing in
 * the same hue gave the map two unrelated meanings in one colour. The ping is
 * deliberately quieter than a hazard pin's too — the hazards are the content,
 * this is just the tool for adding one.
 */
export function ReportFab({ onPress, testID }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.pingSlot} pointerEvents="none">
        <RadarPing size={SIZE} color={colors.ink} rings={2} intensity={0.16} durationMs={3400} />
      </View>
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
  // The caption sits below the button, so the rings have to be centred on the
  // button itself rather than on the wrapper.
  pingSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SIZE,
  },
  halo: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: radii.full,
    backgroundColor: colors.ink,
    opacity: 0.08,
    top: -(HALO - SIZE) / 2,
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
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
    fontSize: 30,
    lineHeight: 34,
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
