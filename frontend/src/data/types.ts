export type DangerLevel = 'dangerous' | 'moderate' | 'low';
export type HazardStatus = 'active' | 'fixed';
export type HazardKind =
  | 'construction'
  | 'unlit'
  | 'pothole'
  | 'highway'
  | 'debris'
  | 'no_bike_lane';

export interface LngLat {
  lng: number;
  lat: number;
}

/** Minutes from midnight. Wraps when startMin > endMin (e.g. 19:00–06:00). */
export interface TimeWindow {
  startMin: number;
  endMin: number;
}

/**
 * Where a verdict came from. 'rider' means a person corrected the model —
 * shown as theirs, never behind a confidence score the model never gave it.
 */
export type VerdictSource = 'openai' | 'fallback' | 'rider';

export interface AIVerdict {
  kind: HazardKind;
  dangerLevel: DangerLevel;
  /** 0..1, surfaced to the user so they can check the photo themselves. */
  confidence: number;
  caption: string;
  source?: VerdictSource;
}

export interface HazardReport {
  id: string;
  hazardId: string;
  photo: string;
  reportedAt: string;
  reporterName: string;
  intent: 'report' | 'fix';
  /**
   * On a fix report, whether the model judged the hazard repaired. Null when
   * nothing read it — never the same as a judgement of "not fixed".
   */
  fixed?: boolean | null;
  ai: AIVerdict;
}

export interface Hazard {
  id: string;
  coord: LngLat;
  kind: HazardKind;
  dangerLevel: DangerLevel;
  status: HazardStatus;
  activeWindow?: TimeWindow;
  /** Chronological, oldest first. */
  reports: HazardReport[];
  streetName: string;
  /**
   * Days this hazard is expected to take to be repaired, as estimated from the
   * photo. Null for kinds that do not simply get fixed, and for hazards no
   * model read — a per-kind constant stands in for those. See lib/staleness.
   */
  expectedClearDays?: number | null;
}

export interface ManeuverStep {
  id: string;
  instruction: string;
  modifier: 'left' | 'right' | 'straight' | 'slight-left' | 'slight-right' | 'arrive';
  distanceM: number;
  /** Index into RouteOption.geometry. */
  atIndex: number;
}

export interface RouteOption {
  id: string;
  label: string;
  durationMin: number;
  distanceKm: number;
  geometry: LngLat[];
  steps: ManeuverStep[];
  hazardIds: string[];
}

export interface Place {
  id: string;
  name: string;
  address: string;
  coord: LngLat;
  recent?: boolean;
}

export const KIND_LABEL: Record<HazardKind, string> = {
  construction: 'Construction',
  unlit: 'No street lighting',
  pothole: 'Pothole / broken surface',
  highway: 'Fast traffic, no shoulder',
  debris: 'Debris on path',
  no_bike_lane: 'Bike lane ends',
};
