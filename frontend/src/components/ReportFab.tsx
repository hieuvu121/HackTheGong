import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radii, shadows, spacing } from '../theme/tokens';
import { type } from '../theme/type';

interface Props {
  onPress: () => void;
  testID?: string;
}

/** The single, clearly labelled report action used on every map. */
export function ReportFab({ onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Report a hazard"
      onPress={onPress}
      style={({ pressed }) => [styles.button, shadows.level2, pressed && styles.pressed]}
    >
      <Text style={[type.buttonMd, styles.label]}>Report hazard</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  label: { color: colors.onPrimary },
});
