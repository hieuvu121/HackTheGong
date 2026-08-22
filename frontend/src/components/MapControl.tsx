import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';

interface Props {
  glyph: string;
  label: string;
  onPress: () => void;
  testID?: string;
}

/** A small round control floating over the map — locate, report-while-riding. */
export function MapControl({ glyph, label, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, shadows.level3, pressed && styles.pressed]}
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfacePressed },
  glyph: { color: colors.ink, fontSize: 18, lineHeight: 22 },
});
