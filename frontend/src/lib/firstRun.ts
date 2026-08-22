/**
 * Whether onboarding has been shown yet.
 *
 * Session-scoped on purpose: there is no storage layer in this draft, so this
 * resets on a cold start rather than pretending to persist. Swap the two
 * functions for AsyncStorage reads when there is a real one.
 */
let seen = false;

export function hasSeenOnboarding(): boolean {
  return seen;
}

export function markOnboardingSeen(): void {
  seen = true;
}

/** Test seam. */
export function resetOnboarding(): void {
  seen = false;
}
