import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';

interface Props {
  glyph?: string;
  kind?: 'text' | 'locate';
  label: string;
  onPress: () => void;
  testID?: string;
}

/** A small round utility control floating over the map. */
export function MapControl({ glyph, kind = 'text', label, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, shadows.level3, pressed && styles.pressed]}
    >
      {kind === 'locate' ? (
        <View style={styles.locateOuter} pointerEvents="none">
          <View style={styles.locateInner} />
        </View>
      ) : (
        <Text style={styles.glyph}>{glyph}</Text>
      )}
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
  locateOuter: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateInner: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.ink,
  },
});
