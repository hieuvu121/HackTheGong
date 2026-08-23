import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Hazard, LngLat } from '../data/types';
import { isAfterDark, civilDawn } from '../lib/sun';
import { colors, radii, spacing } from '../theme/tokens';
import { type } from '../theme/type';

interface Props {
  hazards: Hazard[];
  /** The time the rider is planning for, not necessarily now. */
  at: Date;
  /** Where they are — darkness is a question about a place. */
  coord: LngLat;
  testID?: string;
}

const clock = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * Says out loud that unlit roads have just become a problem.
 *
 * Without it the only signal is extra pins quietly appearing on the map after
 * dusk, which a rider has to notice and interpret. This names the thing, counts
 * it, and says when it stops mattering.
 */
export function NightBanner({ hazards, at, coord, testID = 'night-banner' }: Props) {
  if (!isAfterDark(coord, at)) return null;

  const unlit = hazards.filter((h) => h.kind === 'unlit' && h.status !== 'fixed');
  if (unlit.length === 0) return null;

  const until = clock(civilDawn(coord, at));
  const count = `${unlit.length} unlit ${unlit.length === 1 ? 'stretch' : 'stretches'}`;

  return (
    <View testID={testID} style={styles.wrap}>
      <Text style={[type.bodyMdStrong, { color: colors.ink }]}>
        {`After dark · ${count} near you`}
      </Text>
      <Text style={[type.bodySm, { color: colors.body }]}>
        {`Routes go around them until ${until}, when it gets light again.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.ink,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: 2,
  },
});
