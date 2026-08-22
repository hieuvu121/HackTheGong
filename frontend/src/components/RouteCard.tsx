import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, danger } from '../theme/tokens';
import { type } from '../theme/type';
import { DangerLevel, RouteOption } from '../data/types';
import { HazardCount } from '../lib/scoring';

// Worst first, matching how the router weighs them.
const LEVELS: DangerLevel[] = ['dangerous', 'moderate', 'low'];

export type RouteBadge = 'safest' | 'recommended';

const BADGE_LABEL: Record<RouteBadge, string> = {
  safest: 'Safest',
  // Tied on hazards with another route, so it wins on time, not on safety.
  recommended: 'Recommended',
};

interface Props {
  route: RouteOption;
  counts: HazardCount;
  selected: boolean;
  badge?: RouteBadge;
  onPress: () => void;
  testID?: string;
}

export function RouteCard({ route, counts, selected, badge, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={styles.headRow}>
        <Text style={[type.displaySm, { color: colors.ink }]}>{`${route.durationMin} min`}</Text>
        {badge && (
          <View style={styles.tag}>
            <Text style={[type.bodySmStrong, { color: colors.onPrimary }]}>
              {BADGE_LABEL[badge]}
            </Text>
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
          // The mix, not just the count: two routes can both carry "2 hazards"
          // and score very differently, which made the Safest tag look arbitrary.
          // Spelling out the tiers also stops colour being the only carrier.
          LEVELS.filter((l) => counts[l] > 0).map((l, i) => (
            <View key={l} style={styles.tier}>
              {i > 0 && <Text style={[type.bodySm, styles.sep]}>·</Text>}
              <View style={[styles.dot, { backgroundColor: danger[l].color }]} />
              <Text style={[type.bodySmStrong, { color: colors.ink }]}>
                {`${counts[l]} ${danger[l].label.toLowerCase()}`}
              </Text>
            </View>
          ))
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
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tier: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sep: { color: colors.mute, marginRight: 2 },
  dot: { width: 8, height: 8, borderRadius: radii.full },
});
