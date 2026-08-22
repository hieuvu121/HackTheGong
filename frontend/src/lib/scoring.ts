import { DangerLevel, Hazard, RouteOption } from '../data/types';
import { isHazardActiveAt } from './time';

export interface HazardCount {
  dangerous: number;
  moderate: number;
  low: number;
  total: number;
}

/** Mirrors the production GraphHopper custom_model penalties. */
const WEIGHT: Record<DangerLevel, number> = { dangerous: 10, moderate: 4, low: 1 };

export function activeHazardsForRoute(
  route: RouteOption,
  hazards: Hazard[],
  at: Date,
): Hazard[] {
  const byId = new Map(hazards.map((h) => [h.id, h]));
  return route.hazardIds
    .map((id) => byId.get(id))
    .filter((h): h is Hazard => Boolean(h) && isHazardActiveAt(h as Hazard, at));
}

export function countByLevel(hazards: Hazard[]): HazardCount {
  const c: HazardCount = { dangerous: 0, moderate: 0, low: 0, total: 0 };
  for (const h of hazards) {
    c[h.dangerLevel] += 1;
    c.total += 1;
  }
  return c;
}

export function safestRouteId(routes: RouteOption[], hazards: Hazard[], at: Date): string {
  let best = routes[0];
  let bestScore = Infinity;

  for (const r of routes) {
    const score = activeHazardsForRoute(r, hazards, at).reduce(
      (sum, h) => sum + WEIGHT[h.dangerLevel],
      0,
    );

    if (score < bestScore || (score === bestScore && r.durationMin < best.durationMin)) {
      best = r;
      bestScore = score;
    }
  }
  return best.id;
}
