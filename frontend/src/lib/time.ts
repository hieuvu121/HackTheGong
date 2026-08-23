import { Hazard, TimeWindow } from '../data/types';
import { nightWindowFor } from './sun';

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Start-inclusive, end-exclusive. Wraps when startMin > endMin. */
export function isWithinWindow(w: TimeWindow, minutes: number): boolean {
  if (w.startMin <= w.endMin) return minutes >= w.startMin && minutes < w.endMin;
  return minutes >= w.startMin || minutes < w.endMin;
}

/**
 * When a hazard counts, for a rider setting off at this time.
 *
 * An unlit road is worked out from the sun rather than read from a stored
 * window. Darkness moves by more than three hours across the year here, so any
 * fixed hour is wrong for half of it: a stored 19:00 hides a genuinely dark
 * road at 18:30 in June, and invents one at 18:30 in December. Everything else
 * keeps its stored window — a construction site with set hours is not an
 * astronomical question.
 */
export function hazardWindow(h: Hazard, at: Date): TimeWindow | undefined {
  return h.kind === 'unlit' ? nightWindowFor(h.coord, at) : h.activeWindow;
}

export function isHazardActiveAt(h: Hazard, at: Date): boolean {
  if (h.status === 'fixed') return false;
  const window = hazardWindow(h, at);
  if (!window) return true;
  return isWithinWindow(window, minutesOfDay(at));
}

export function formatDepartureLabel(at: Date, isNow: boolean): string {
  if (isNow) return 'Leaving now';
  const hh = String(at.getHours()).padStart(2, '0');
  const mm = String(at.getMinutes()).padStart(2, '0');
  return `Leaving ${hh}:${mm}`;
}

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** The window in words, for the hazard sheet. */
export function formatWindow(w: TimeWindow): string {
  return `between ${hhmm(w.startMin)} and ${hhmm(w.endMin)}`;
}

/**
 * How a hazard's hours read on its own sheet.
 *
 * An unlit road says "after dark" and then the actual times, because those
 * move by hours across the year and a bare 19:00 would be a claim about a
 * fixed hour nothing observes.
 */
export function describeWindow(h: Hazard, at: Date): string | null {
  const window = hazardWindow(h, at);
  if (!window) return null;

  return h.kind === 'unlit'
    ? `after dark — tonight, ${hhmm(window.startMin)} to ${hhmm(window.endMin)}`
    : formatWindow(window);
}
