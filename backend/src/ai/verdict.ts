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
 * Names what was reported so the model knows what to look for, but the benefit
 * of the doubt goes to the rider. Asked to prove a repair, a model refuses on
 * anything it cannot match to the original photo — a clear, ordinary street
 * came back "still looks like a hazard" because it was framed differently.
 *
 * The question is about the line a rider takes, not about the whole frame.
 * Told to look for hazards, a model finds the cones stacked on the verge and
 * calls the road closed, while two cyclists ride past them in the same photo.
 * Roadworks parked beside a route that people are visibly riding is a route
 * that got its road back.
 */
export function fixPrompt(context: FixContext): string {
  const reported = context.caption.trim()
    ? `A rider reported this spot with: "${context.caption.trim()}"`
    : `A rider reported ${KIND_WORDS[context.kind]} at this spot.`;

  return `${reported}

Another rider has gone back and photographed the spot to show it has been dealt
with. They were standing there and you were not, so take them at their word
unless the photo itself contradicts them.

Judge the way a rider would actually go through here, not the whole picture.
Only what stands in that path counts.

Answer fixed: true for any ordinary, usable road or path — clear surface,
nothing standing in the riding line, lit or in daylight. It does not have to
match the original photo's framing, angle or surroundings, and it does not have
to show evidence that a repair happened. A plain street with traffic, parked
cars, people, buildings or street furniture in it counts as fixed. So does one
with roadworks, signs, barriers or cones set off to the side, on a verge, a
footway, a closed parking bay or the far side of the street, as long as the
riding line past them is open. Anyone visibly cycling or walking through
unobstructed settles it: the way is passable.

Answer fixed: false only when the photo shows one of these:
- Something that is not a road or path at all — an interior, a screenshot, a
  person, a close-up of nothing in particular.
- A hazard in the rider's way: works or barriers across the route, a dug-up,
  broken or potholed surface where they would ride, debris or a fallen branch
  over the way, the route closed or fenced off with no way past, or a stretch
  that is dark and unlit.

Say what you see in the caption, in one plain sentence. Confidence is how sure
you are of that answer — not how closely this photo resembles the old one.`;
}
