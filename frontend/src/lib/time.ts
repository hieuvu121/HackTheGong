import { Hazard, TimeWindow } from '../data/types';

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Start-inclusive, end-exclusive. Wraps when startMin > endMin. */
export function isWithinWindow(w: TimeWindow, minutes: number): boolean {
  if (w.startMin <= w.endMin) return minutes >= w.startMin && minutes < w.endMin;
  return minutes >= w.startMin || minutes < w.endMin;
}

export function isHazardActiveAt(h: Hazard, at: Date): boolean {
  if (h.status === 'fixed') return false;
  if (!h.activeWindow) return true;
  return isWithinWindow(h.activeWindow, minutesOfDay(at));
}

export function formatDepartureLabel(at: Date, isNow: boolean): string {
  if (isNow) return 'Leaving now';
  const hh = String(at.getHours()).padStart(2, '0');
  const mm = String(at.getMinutes()).padStart(2, '0');
  return `Leaving ${hh}:${mm}`;
}

/** "after dark, 19:00–06:00" — the window in words, for the hazard sheet. */
export function formatWindow(w: TimeWindow): string {
  const hhmm = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `between ${hhmm(w.startMin)} and ${hhmm(w.endMin)}`;
}
