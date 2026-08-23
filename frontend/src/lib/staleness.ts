import { Hazard, HazardKind } from '../data/types';

/**
 * How long each kind typically takes to be repaired, when no model said.
 *
 * Mirrors the server's own fallback. Only the two kinds actually waiting on a
 * repair appear here: a pothole gets patched and construction ends, but an
 * unlit road does not fix itself, and telling a rider it might have is a lie
 * they could get hurt believing.
 */
export const FALLBACK_CLEAR_DAYS: Partial<Record<HazardKind, number>> = {
  pothole: 30,
  construction: 90,
};

export interface StaleNote {
  /** Days since anyone last reported on this hazard. */
  daysSince: number;
  /** Days this kind of hazard is expected to take. */
  clearDays: number;
}

/**
 * Whether to tell the rider this hazard may already have been dealt with.
 *
 * Presentational only. It never retires a hazard, never changes a status, and
 * never affects routing — the hazard is still drawn and still routed around.
 * All it says is that nobody has confirmed it in longer than this kind of
 * hazard usually takes, which is a reason to go and look, not a fact.
 */
export function mightBeFixed(hazard: Hazard, now: Date = new Date()): StaleNote | null {
  if (hazard.status === 'fixed') return null;

  const clearDays = hazard.expectedClearDays ?? FALLBACK_CLEAR_DAYS[hazard.kind] ?? null;
  if (clearDays === null) return null;

  // The most recent report, not the first: the question is how long it has
  // gone unconfirmed, not how old the pin is.
  const latest = hazard.reports.at(-1);
  if (!latest) return null;

  // Rounded, not floored, to match the "last updated Nd ago" line in the
  // hazard sheet — the same card shows both, and a card reading "updated 40d
  // ago" beside "39 days" looks broken.
  const daysSince = Math.round((now.getTime() - Date.parse(latest.reportedAt)) / 86_400_000);
  return daysSince > clearDays ? { daysSince, clearDays } : null;
}
