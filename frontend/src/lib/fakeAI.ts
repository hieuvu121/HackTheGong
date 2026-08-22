import { AIVerdict, HazardKind, KIND_LABEL } from '../data/types';

export const ANALYSIS_DELAY_MS = 1600;

const SCRIPT: AIVerdict[] = [
  {
    kind: 'construction',
    dangerLevel: 'dangerous',
    confidence: 0.92,
    caption: 'Roadworks blocking the bike lane. Cyclists are pushed into live traffic.',
  },
  {
    kind: 'pothole',
    dangerLevel: 'moderate',
    confidence: 0.79,
    caption: 'Broken road surface in the riding line. Avoidable but risky at speed.',
  },
  {
    kind: 'unlit',
    dangerLevel: 'moderate',
    confidence: 0.68,
    caption: 'No functioning street lighting visible along this section.',
  },
  {
    kind: 'debris',
    dangerLevel: 'low',
    confidence: 0.58,
    caption: 'Loose debris near the path edge. Passable with care.',
  },
];

const delay = <T>(value: T): Promise<T> =>
  new Promise((res) => setTimeout(() => res(value), ANALYSIS_DELAY_MS));

export function analyzeReportPhoto(seed = 0): Promise<AIVerdict> {
  return delay(SCRIPT[Math.abs(Math.trunc(seed)) % SCRIPT.length]);
}

export function analyzeFixPhoto(kind: HazardKind): Promise<AIVerdict> {
  return delay({
    kind,
    dangerLevel: 'low',
    confidence: 0.91,
    caption: `${KIND_LABEL[kind]} no longer visible at this location. Hazard appears resolved.`,
  });
}
