import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { radii } from '../theme/tokens';

interface Props {
  /** Diameter the rings start at — normally the disc they emanate from. */
  size: number;
  color: string;
  /** How far each ring travels, as a multiple of `size`. */
  spread?: number;
  /** Concurrent rings, evenly staggered across one cycle. */
  rings?: number;
  durationMs?: number;
  /** Dashed rings read as "unconfirmed" rather than "live". */
  dashed?: boolean;
  /** Opacity a ring starts at, before fading out. */
  intensity?: number;
  testID?: string;
}

const NATIVE = Platform.OS !== 'web';

/**
 * Expanding concentric rings — the radar sweep behind hazard pins and the
 * report button. Driven by RN's Animated rather than Reanimated: transform and
 * opacity are all this needs, so it can run on the native driver everywhere
 * except web (which has no native driver at all).
 *
 * Honours Reduce Motion by holding the rings still at their resting size.
 */
export function RadarPing({
  size,
  color,
  spread = 2.2,
  rings = 3,
  durationMs = 2600,
  dashed = false,
  intensity = 0.4,
  testID,
}: Props) {
  const progress = useRef(
    Array.from({ length: rings }, () => new Animated.Value(0)),
  ).current;
  const [still, setStill] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (!cancelled) setStill(on);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (still) return;

    const animations = progress.map((value, i) =>
      Animated.sequence([
        // Stagger the ring starts so the sweep is continuous rather than a
        // single pulse. This has to be a same-driver hold on the ring's own
        // value: Animated.delay is hardcoded to useNativeDriver: false, and
        // mixing drivers inside one sequence stops the whole thing running.
        Animated.timing(value, {
          toValue: 0,
          duration: (durationMs / rings) * i,
          useNativeDriver: NATIVE,
        }),
        Animated.loop(
          Animated.timing(value, {
            toValue: 1,
            duration: durationMs,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE,
          }),
        ),
      ]),
    );

    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [still, durationMs, rings, progress]);

  return (
    <View testID={testID} style={styles.wrap} pointerEvents="none">
      {progress.map((value, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: radii.full,
              borderColor: color,
              borderStyle: dashed ? 'dashed' : 'solid',
              marginLeft: -size / 2,
              marginTop: -size / 2,
              opacity: still
                ? intensity * 0.6
                : value.interpolate({ inputRange: [0, 1], outputRange: [intensity, 0] }),
              transform: [
                {
                  scale: still
                    ? 1 + (spread - 1) * ((i + 1) / (rings + 1))
                    : value.interpolate({ inputRange: [0, 1], outputRange: [1, spread] }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Zero-size anchor at the centre, so rings can grow past the parent without
  // affecting its layout.
  wrap: { position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 },
  ring: { position: 'absolute', borderWidth: 2 },
});
