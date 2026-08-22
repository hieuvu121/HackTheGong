import { DangerLevel, HazardKind } from '../hazards/hazard.entity';
import { VerdictSource } from '../reports/report.entity';

export interface Verdict {
  kind: HazardKind;
  dangerLevel: DangerLevel;
  /** The model's own estimate, 0..1. Self-reported, not calibrated. */
  confidence: number;
  caption: string;
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
