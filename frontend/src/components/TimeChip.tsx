import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type } from '../theme/type';
import { formatDepartureLabel } from '../lib/time';

interface Props {
  at: Date;
  isNow: boolean;
  onPress: () => void;
  testID?: string;
}

export function TimeChip({ at, isNow, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, shadows.level3]}
    >
      <Text style={[type.bodySmStrong, { color: colors.ink }]}>
        {formatDepartureLabel(at, isNow)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.canvas,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
