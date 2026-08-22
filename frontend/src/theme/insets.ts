import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from './tokens';

/**
 * Top offset for screen content. Clears the notch / Dynamic Island on native,
 * and falls back to a sensible gutter on web where insets are all zero.
 */
export function useScreenTop(extra: number = spacing.lg): number {
  const { top } = useSafeAreaInsets();
  return Math.max(top, spacing.xl) + extra;
}

/** Bottom offset for content that must clear the home indicator. */
export function useScreenBottom(extra: number = spacing.lg): number {
  const { bottom } = useSafeAreaInsets();
  return bottom + extra;
}
