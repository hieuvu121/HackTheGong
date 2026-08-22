import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, danger } from '../theme/tokens';
import { type } from '../theme/type';
import { DangerLevel } from '../data/types';

interface Props {
  level: DangerLevel;
  compact?: boolean;
  testID?: string;
}

export function DangerBadge({ level, compact, testID }: Props) {
  const d = danger[level];
  return (
    <View
      testID={testID}
      style={[styles.badge, { borderColor: d.color }, compact && styles.compact]}
    >
      <View
        style={[
          styles.dot,
          {
            borderColor: d.color,
            backgroundColor: d.fill === 'outline' ? 'transparent' : d.color,
          },
          d.fill === 'half' && { opacity: 0.5 },
        ]}
      />
      <Text style={[type.bodySmStrong, { color: colors.ink }]}>{d.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  compact: { paddingVertical: 2, paddingHorizontal: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radii.full, borderWidth: 1.5 },
});
