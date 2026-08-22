import { activeHazardsForRoute, countByLevel, safestRouteId, hazardScore, isStrictlySafest } from '../scoring';
import { HAZARDS } from '../../data/hazards';
import { ROUTES } from '../../data/routes';

const noon = new Date(2026, 7, 22, 12, 0);
const night = new Date(2026, 7, 22, 21, 0);

describe('activeHazardsForRoute', () => {
  it('drops the unlit hazard at noon and keeps it at night', () => {
    const safe = ROUTES.find((r) => r.id === 'rt-safe')!;
    const day = activeHazardsForRoute(safe, HAZARDS, noon).map((h) => h.id);
    const dark = activeHazardsForRoute(safe, HAZARDS, night).map((h) => h.id);
    expect(day).not.toContain('hz-2');
    expect(dark).toContain('hz-2');
  });

  it('ignores hazard ids that are fixed', () => {
    const withFixed = { ...ROUTES[0], hazardIds: ['hz-6'] };
    expect(activeHazardsForRoute(withFixed, HAZARDS, noon)).toHaveLength(0);
  });

  it('ignores unknown hazard ids without throwing', () => {
    const bogus = { ...ROUTES[0], hazardIds: ['nope'] };
    expect(activeHazardsForRoute(bogus, HAZARDS, noon)).toHaveLength(0);
  });
});

describe('countByLevel', () => {
  it('buckets hazards by tier and totals them', () => {
    const fast = ROUTES.find((r) => r.id === 'rt-fast')!;
    const c = countByLevel(activeHazardsForRoute(fast, HAZARDS, noon));
    expect(c.dangerous).toBe(2);
    expect(c.moderate).toBe(1);
    expect(c.low).toBe(0);
    expect(c.total).toBe(3);
  });

  it('returns all zeroes for an empty list', () => {
    expect(countByLevel([])).toEqual({ dangerous: 0, moderate: 0, low: 0, total: 0 });
  });
});

describe('safestRouteId', () => {
  it('prefers the route with fewest weighted hazards, not the fastest', () => {
    expect(safestRouteId(ROUTES, HAZARDS, noon)).toBe('rt-safe');
  });

  it('breaks ties on duration', () => {
    const a = { ...ROUTES[0], id: 'a', hazardIds: [], durationMin: 30 };
    const b = { ...ROUTES[1], id: 'b', hazardIds: [], durationMin: 20 };
    expect(safestRouteId([a, b], HAZARDS, noon)).toBe('b');
  });
});

describe('isStrictlySafest', () => {
  const day = new Date('2026-08-22T09:00:00');
  const night = new Date('2026-08-22T21:00:00');

  it('crowns the one route that is genuinely lowest by day', () => {
    const winners = ROUTES.filter((r) => isStrictlySafest(r, ROUTES, HAZARDS, day));
    expect(winners.map((r) => r.id)).toEqual(['rt-safe']);
  });

  it('crowns nobody after dark, when two routes tie', () => {
    // The unlit hazard switches on at 19:00 and levels rt-safe with
    // rt-balanced. A rider cannot tell them apart on safety, so neither should
    // claim to be safest.
    expect(hazardScore(ROUTES[0], HAZARDS, night)).toBe(hazardScore(ROUTES[1], HAZARDS, night));
    const winners = ROUTES.filter((r) => isStrictlySafest(r, ROUTES, HAZARDS, night));
    expect(winners).toHaveLength(0);
  });

  it('scores the hazardous route far above the calm ones', () => {
    const fast = ROUTES.find((r) => r.id === 'rt-fast')!;
    const safe = ROUTES.find((r) => r.id === 'rt-safe')!;
    expect(hazardScore(fast, HAZARDS, day)).toBeGreaterThan(hazardScore(safe, HAZARDS, day));
  });
});
