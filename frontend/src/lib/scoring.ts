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

/** Total hazard weight a route carries at a given departure time. */
export function hazardScore(route: RouteOption, hazards: Hazard[], at: Date): number {
  return activeHazardsForRoute(route, hazards, at).reduce(
    (sum, h) => sum + WEIGHT[h.dangerLevel],
    0,
  );
}

/**
 * True only when nothing else is as safe. Two routes carrying the same hazards
 * are not distinguishable on safety, and badging one of them "Safest" reads as
 * arbitrary — which is exactly what a rider sees when both cards say the same
 * thing. Ties fall through to the weaker "Recommended" badge instead.
 */
export function isStrictlySafest(
  route: RouteOption,
  routes: RouteOption[],
  hazards: Hazard[],
  at: Date,
): boolean {
  const mine = hazardScore(route, hazards, at);
  return routes.every((r) => r.id === route.id || hazardScore(r, hazards, at) > mine);
}

export function safestRouteId(routes: RouteOption[], hazards: Hazard[], at: Date): string {
  let best = routes[0];
  let bestScore = Infinity;

  for (const r of routes) {
    const score = hazardScore(r, hazards, at);

    if (score < bestScore || (score === bestScore && r.durationMin < best.durationMin)) {
      best = r;
      bestScore = score;
    }
  }
  return best.id;
}
