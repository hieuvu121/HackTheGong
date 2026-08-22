import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RadarPing } from './RadarPing';
import { PinState } from '../lib/pins';
import { DangerLevel } from '../data/types';
import { colors, danger, radii, shadows } from '../theme/tokens';

interface Props {
  level: DangerLevel;
  state: PinState;
  onPress?: () => void;
  label?: string;
  testID?: string;
}

interface Spec {
  size: number;
  color: string;
  /** Filled discs carry a white glyph; hollow ones carry a coloured glyph. */
  filled: boolean;
  dashed: boolean;
  rings: number;
  intensity: number;
  durationMs: number;
  opacity: number;
}

/**
 * An active hazard is loud — solid, level-coloured, three live rings. One a
 * rider has photographed as fixed goes hollow and dotted: still on the map and
 * still routed around, but no longer asserting itself. Retired hazards are not
 * drawn at all.
 */
function spec(state: PinState, level: DangerLevel): Spec {
  if (state === 'unconfirmed') {
    return {
      size: 26,
      color: danger.moderate.color,
      filled: false,
      dashed: true,
      rings: 2,
      intensity: 0.55,
      durationMs: 3200,
      opacity: 0.9,
    };
  }
  return {
    size: 30,
    color: danger[level].color,
    filled: true,
    dashed: false,
    rings: 3,
    intensity: 0.42,
    durationMs: 2600,
    opacity: 1,
  };
}

/** Outline triangle with an exclamation inside, drawn from plain views. */
function WarningGlyph({ fill, ink }: { fill: string; ink: string }) {
  return (
    <View style={styles.glyphBox}>
      <View style={[styles.triangle, { borderBottomColor: ink }]} />
      <View style={[styles.triangleInner, { borderBottomColor: fill }]} />
      <Text style={[styles.bang, { color: ink }]}>!</Text>
    </View>
  );
}

export function HazardPin({ level, state, onPress, label, testID }: Props) {
  const s = spec(state, level);
  const ink = s.filled ? colors.onDark : s.color;
  const fill = s.filled ? s.color : colors.canvas;

  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={label}
      onPress={onPress}
      // The disc is well under the 44pt minimum on purpose — it is a map
      // marker, not a button — so the tap target is padded back out.
      hitSlop={16}
      style={({ pressed }) => [
        styles.tap,
        { width: s.size, height: s.size, opacity: s.opacity },
        pressed && styles.pressed,
      ]}
    >
      <RadarPing
        size={s.size}
        color={s.color}
        rings={s.rings}
        dashed={s.dashed}
        intensity={s.intensity}
        durationMs={s.durationMs}
      />

      {/* Static bloom under the disc — the "glow" the rings sweep out of. */}
      <View
        style={[
          styles.glow,
          {
            width: s.size * 1.5,
            height: s.size * 1.5,
            marginLeft: (s.size * 1.5) / -2,
            marginTop: (s.size * 1.5) / -2,
            backgroundColor: s.color,
          },
        ]}
        pointerEvents="none"
      />

      <View
        style={[
          styles.disc,
          shadows.level3,
          {
            width: s.size,
            height: s.size,
            backgroundColor: fill,
            borderColor: s.filled ? colors.canvas : s.color,
            borderStyle: s.dashed ? 'dashed' : 'solid',
            borderWidth: 2,
          },
        ]}
      >
        {state === 'active' ? (
          <WarningGlyph fill={fill} ink={ink} />
        ) : (
          <Text style={[styles.symbol, { color: ink }]}>?</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tap: { alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.9 }] },
  glow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderRadius: radii.full,
    opacity: 0.16,
  },
  disc: {
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 14, lineHeight: 17, fontWeight: '800' },
  glyphBox: { width: 15, height: 13, alignItems: 'center', justifyContent: 'flex-end' },
  // Border trick: a zero-size box whose bottom border is the triangle.
  triangle: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 7.5,
    borderRightWidth: 7.5,
    borderBottomWidth: 13,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  // A second, smaller triangle in the disc colour hollows the first one out.
  triangleInner: {
    position: 'absolute',
    bottom: 1.5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bang: {
    position: 'absolute',
    bottom: 0.5,
    fontSize: 8,
    lineHeight: 9,
    fontWeight: '800',
  },
});
