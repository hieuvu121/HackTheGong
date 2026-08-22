import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type } from '../theme/type';
import { ManeuverStep } from '../data/types';

const GLYPH: Record<ManeuverStep['modifier'], string> = {
  left: '←',
  right: '→',
  straight: '↑',
  'slight-left': '↖',
  'slight-right': '↗',
  arrive: '◉',
};

interface Props {
  step: ManeuverStep;
  distanceM: number;
}

export function ManeuverBanner({ step, distanceM }: Props) {
  return (
    <View style={[styles.banner, shadows.level2]}>
      <Text style={styles.glyph}>{GLYPH[step.modifier]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[type.bodySmStrong, { color: colors.mute }]}>
          {distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM} m`}
        </Text>
        <Text style={[type.displaySm, { color: colors.onDark }]}>{step.instruction}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  glyph: { color: colors.onDark, fontSize: 34, lineHeight: 40 },
});
