import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type } from '../theme/type';

type Variant = 'primary' | 'secondary' | 'subtle' | 'floating' | 'large';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}

const BG: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.canvas,
  subtle: colors.canvasSoft,
  floating: colors.canvas,
  large: colors.primary,
};

const FG: Record<Variant, string> = {
  primary: colors.onPrimary,
  secondary: colors.ink,
  subtle: colors.ink,
  floating: colors.ink,
  large: colors.onPrimary,
};

export function Button({ label, onPress, variant = 'primary', disabled, testID, style }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: BG[variant],
          // button-large-rounded is DESIGN.md's one documented pill exception
          borderRadius: variant === 'large' ? radii.xl : radii.pill,
          paddingVertical: variant === 'large' ? spacing.lg : spacing.md,
          paddingHorizontal: spacing.xl,
          opacity: disabled ? 0.35 : 1,
        },
        variant === 'floating' && shadows.level3,
        variant === 'secondary' && styles.hairline,
        style,
      ]}
    >
      <Text
        style={[variant === 'large' ? type.buttonLarge : type.buttonMd, { color: FG[variant] }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  hairline: { borderWidth: 1, borderColor: colors.surfacePressed },
});
