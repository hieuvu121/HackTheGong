import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, danger } from '../theme/tokens';
import { type } from '../theme/type';
import { RouteOption } from '../data/types';
import { HazardCount } from '../lib/scoring';

interface Props {
  route: RouteOption;
  counts: HazardCount;
  selected: boolean;
  isSafest: boolean;
  onPress: () => void;
  testID?: string;
}

export function RouteCard({ route, counts, selected, isSafest, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={styles.headRow}>
        <Text style={[type.displaySm, { color: colors.ink }]}>{`${route.durationMin} min`}</Text>
        {isSafest && (
          <View style={styles.tag}>
            <Text style={[type.bodySmStrong, { color: colors.onPrimary }]}>Safest</Text>
          </View>
        )}
      </View>

      <Text style={[type.bodySm, { color: colors.body }]}>
        {`${route.distanceKm} km · ${route.label}`}
      </Text>

      <View style={styles.hazardRow}>
        {counts.total === 0 ? (
          <Text style={[type.bodySmStrong, { color: colors.body }]}>No known hazards</Text>
        ) : (
          <>
            <View style={styles.dots}>
              {counts.dangerous > 0 && (
                <View style={[styles.dot, { backgroundColor: danger.dangerous.color }]} />
              )}
              {counts.moderate > 0 && (
                <View style={[styles.dot, { backgroundColor: danger.moderate.color }]} />
              )}
              {counts.low > 0 && (
                <View style={[styles.dot, { backgroundColor: danger.low.color }]} />
              )}
            </View>
            <Text style={[type.bodySmStrong, { color: colors.ink }]}>
              {`${counts.total} hazard${counts.total === 1 ? '' : 's'}`}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.canvasSoft,
    gap: spacing.xxs,
  },
  selected: { borderColor: colors.ink },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: radii.full },
});
