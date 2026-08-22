import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';

interface Props {
  kind: 'back' | 'close';
  onPress: () => void;
  /** Floating over a map rather than sitting on a plain screen. */
  floating?: boolean;
  testID?: string;
}

const GLYPH = { back: '‹', close: '✕' } as const;
const LABEL = { back: 'Go back', close: 'Close' } as const;

/**
 * The way out of a screen. Headers are off across the app, so every screen
 * that isn't the map draws one of these itself — without it there is no exit
 * at all on web or Android.
 */
export function NavButton({ kind, onPress, floating, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={LABEL[kind]}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        floating ? [styles.floating, shadows.level3] : styles.plain,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.glyph, kind === 'back' && styles.glyphBack]}>{GLYPH[kind]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: { backgroundColor: colors.canvasSoft },
  floating: { backgroundColor: colors.canvas },
  pressed: { backgroundColor: colors.surfacePressed },
  glyph: { color: colors.ink, fontSize: 17, lineHeight: 20 },
  // The chevron's optical centre sits right of its box.
  glyphBack: { fontSize: 30, lineHeight: 34, marginTop: -3, marginRight: 3 },
});
