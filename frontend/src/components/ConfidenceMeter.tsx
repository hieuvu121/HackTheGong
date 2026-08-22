import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type } from '../theme/type';
import { VerdictSource } from '../data/types';

interface Props {
  /** 0..1, self-reported by the model. */
  confidence: number;
  source: VerdictSource;
  testID?: string;
}

/**
 * How sure the model says it is.
 *
 * Labelled as the model's own estimate on purpose: it is not a calibrated
 * probability, and a rider deciding whether to trust a rating deserves to know
 * the difference. A fallback verdict says so outright rather than showing 0%,
 * and a rider's own correction is never shown under a model's score.
 */
export function ConfidenceMeter({ confidence, source, testID }: Props) {
  if (source === 'rider') {
    return (
      <View testID={testID} style={styles.wrap}>
        <Text style={[type.bodySmStrong, { color: colors.ink }]}>Your description</Text>
        <Text style={[type.caption, { color: colors.body }]}>
          You corrected what the model said. Riders will see this as your words, not its.
        </Text>
      </View>
    );
  }

  if (source === 'fallback') {
    return (
      <View testID={testID} style={styles.wrap}>
        <Text style={[type.bodySmStrong, { color: colors.ink }]}>Not analysed</Text>
        <Text style={[type.caption, { color: colors.body }]}>
          No model read this photo. The rating is a starting point — set it yourself.
        </Text>
      </View>
    );
  }

  const pct = Math.round(confidence * 100);

  return (
    <View testID={testID} style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[type.bodySmStrong, { color: colors.ink }]}>Model confidence</Text>
        <Text style={[type.bodySmStrong, { color: colors.ink }]}>{`${pct}%`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={[type.caption, { color: colors.body }]}>
        The model’s own estimate, not a measured accuracy. Check the photo yourself.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfacePressed,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.ink, borderRadius: radii.pill },
});
