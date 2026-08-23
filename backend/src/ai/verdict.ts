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

/** What the model is being asked to compare a fix photo against. */
export interface FixContext {
  kind: HazardKind;
  /** The most recent description of the hazard, as riders last saw it. */
  caption: string;
}

/**
 * The verdict on whether a reported hazard has been dealt with.
 *
 * Deliberately not a Verdict: asking "what hazard is this?" of a photo of
 * freshly laid tarmac is the wrong question, and it used to come back
 * "construction" — the rider's proof that a pothole was gone was filed as a
 * new construction hazard.
 */
export interface FixVerdict {
  /**
   * Null means nothing judged it. Not false: "not fixed" is a claim, and
   * making it on no evidence would warn a rider off a submission they can see
   * with their own eyes is correct.
   */
  fixed: boolean | null;
  confidence: number;
  caption: string;
  source: VerdictSource;
}

const KIND_WORDS: Record<HazardKind, string> = {
  construction: 'construction blocking the way',
  unlit: 'an unlit stretch of road',
  pothole: 'a pothole or broken surface',
  highway: 'fast traffic with no shoulder',
  debris: 'debris on the path',
  no_bike_lane: 'a bike lane that ends',
};

/**
 * The question to put to the model about a fix photo.
 *
 * Comparative on purpose. Asked in isolation — "is this road clear?" — a model
 * says yes to any tidy photo, including a stretch that never had a hazard on
 * it. Naming what was reported is what makes the answer mean anything.
 */
export function fixPrompt(context: FixContext): string {
  const reported = context.caption.trim()
    ? `A rider reported this spot with: "${context.caption.trim()}"`
    : `A rider reported ${KIND_WORDS[context.kind]} at this spot.`;

  return `${reported}

Another rider has gone back and photographed the same spot. Judge only what is
visible in this new photo: has that hazard been repaired or cleared?

Answer fixed: true only if the photo shows the hazard genuinely dealt with —
resurfaced, removed, reopened. Answer false if it is still there, only partly
done, or the photo does not show enough to tell. Say which in the caption, in
one plain sentence. Give a low confidence when the photo is unclear or shows a
different spot.`;
}
