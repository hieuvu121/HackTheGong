import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/tokens';
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
      accessibilityLabel={`Change departure time, ${formatDepartureLabel(at, isNow)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.copy}>
        <Text style={[type.caption, { color: colors.body }]}>Departure</Text>
        <Text style={[type.bodySmStrong, { color: colors.ink }]}>
          {formatDepartureLabel(at, isNow)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minWidth: 122,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfacePressed },
  copy: { alignItems: 'flex-start' },
});
