import { DangerLevel, HazardKind } from '../hazards/hazard.entity';
import { VerdictSource } from '../reports/report.entity';

export interface Verdict {
  kind: HazardKind;
  dangerLevel: DangerLevel;
  /** The model's own estimate, 0..1. Self-reported, not calibrated. */
  confidence: number;
  caption: string;
  /**
   * Roughly how long this kind of hazard takes to be repaired, in days.
   *
   * Null whenever there is nothing honest to say: a hazard that does not
   * simply get fixed, or a verdict no model produced. It drives a note on the
   * hazard sheet — never a status change, and never a removal.
   */
  clearsInDays: number | null;
  /** 'fallback' means no model ran. Never present one as the other. */
  source: VerdictSource;
}

export const HAZARD_KINDS: HazardKind[] = [
  'construction',
  'unlit',
  'pothole',
  'highway',
  'debris',
  'no_bike_lane',
];

export const DANGER_LEVELS: DangerLevel[] = ['dangerous', 'moderate', 'low'];

/**
 * How long each kind typically takes to clear, when no model said otherwise.
 *
 * Only the two kinds that are actually waiting on a repair. An unlit road is
 * not maintenance-pending, and an unlit road that "might have cleared itself"
 * is a lie a rider could get hurt believing — so those stay null forever.
 */
const FALLBACK_CLEAR_DAYS: Partial<Record<HazardKind, number>> = {
  pothole: 30,
  construction: 90,
};

export function fallbackClearDays(kind: HazardKind): number | null {
  return FALLBACK_CLEAR_DAYS[kind] ?? null;
}
