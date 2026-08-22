import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, danger } from '../theme/tokens';
import { type } from '../theme/type';
import { DangerLevel } from '../data/types';

interface Props {
  level: DangerLevel;
  testID?: string;
}

export function DangerBadge({ level, testID }: Props) {
  const d = danger[level];
  return (
    <View
      testID={testID}
      style={[styles.badge, { borderColor: d.color }]}
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
  dot: { width: 10, height: 10, borderRadius: radii.full, borderWidth: 1.5 },
});
