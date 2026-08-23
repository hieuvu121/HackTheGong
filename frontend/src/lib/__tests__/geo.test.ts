import {
  haversineMeters,
  checkGate,
  GATE_RADIUS_M,
  bearingBetween,
  bearingDelta,
  scatterNear,
} from '../geo';
import { ORIGIN } from '../../data/locale';

const wollongong = { lng: 150.8931, lat: -34.4278 };

describe('haversineMeters', () => {
  it('returns zero for the same point', () => {
    expect(haversineMeters(wollongong, wollongong)).toBe(0);
  });

  it('measures a known short distance', () => {
    const north = { lng: 150.8931, lat: -34.4268 }; // ~111m north
    expect(haversineMeters(wollongong, north)).toBeGreaterThan(105);
    expect(haversineMeters(wollongong, north)).toBeLessThan(118);
  });

  it('is symmetric', () => {
    const other = { lng: 150.9012, lat: -34.4265 };
    expect(haversineMeters(wollongong, other)).toBeCloseTo(haversineMeters(other, wollongong), 6);
  });
});

describe('checkGate', () => {
  it('allows a user standing at the hazard', () => {
    expect(checkGate(wollongong, wollongong)).toEqual({ withinRange: true, distanceM: 0 });
  });

  it('allows a user just inside the radius', () => {
    const near = { lng: 150.8931, lat: -34.42744 }; // ~40m
    const r = checkGate(near, wollongong);
    expect(r.withinRange).toBe(true);
    expect(r.distanceM).toBeLessThan(GATE_RADIUS_M);
  });

  it('blocks a user outside the radius', () => {
    const far = { lng: 150.9012, lat: -34.4265 }; // ~780m
    const r = checkGate(far, wollongong);
    expect(r.withinRange).toBe(false);
    expect(r.distanceM).toBeGreaterThan(GATE_RADIUS_M);
  });

  it('rounds the distance to a whole metre for display', () => {
    const near = { lng: 150.8935, lat: -34.428 };
    expect(Number.isInteger(checkGate(near, wollongong).distanceM)).toBe(true);
  });
});

describe('bearingBetween', () => {
  const here = { lng: 150.8935, lat: -34.4278 };

  it('reads 0 due north and 90 due east', () => {
    expect(bearingBetween(here, { ...here, lat: here.lat + 0.01 })).toBeCloseTo(0, 0);
    expect(bearingBetween(here, { ...here, lng: here.lng + 0.01 })).toBeCloseTo(90, 0);
  });

  it('reads 180 due south and 270 due west', () => {
    expect(bearingBetween(here, { ...here, lat: here.lat - 0.01 })).toBeCloseTo(180, 0);
    expect(bearingBetween(here, { ...here, lng: here.lng - 0.01 })).toBeCloseTo(270, 0);
  });

  it('always returns a positive bearing', () => {
    expect(bearingBetween(here, { lng: here.lng - 0.02, lat: here.lat - 0.02 })).toBeGreaterThan(0);
  });
});

describe('bearingDelta', () => {
  it('signs a turn to the right positive and left negative', () => {
    expect(bearingDelta(0, 90)).toBe(90);
    expect(bearingDelta(0, 270)).toBe(-90);
  });

  it('takes the short way round the wrap', () => {
    expect(bearingDelta(350, 10)).toBe(20);
    expect(bearingDelta(10, 350)).toBe(-20);
  });
});

describe('scatterNear', () => {
  // A fixed sequence stands in for Math.random, so the assertions are about
  // the maths and not about luck.
  const rng = (...values: number[]) => {
    let i = 0;
    return () => values[i++ % values.length];
  };

  it('stays inside the radius asked for', () => {
    for (const pair of [[0, 0], [0.999, 0.999], [0.5, 0.25], [0.01, 0.87]]) {
      const at = scatterNear(ORIGIN, 1500, rng(...pair));
      expect(haversineMeters(ORIGIN, at)).toBeLessThanOrEqual(1500);
    }
  });

  it('lands somewhere other than the origin', () => {
    const at = scatterNear(ORIGIN, 1500, rng(0.5, 0.5));
    expect(haversineMeters(ORIGIN, at)).toBeGreaterThan(0);
  });

  it('puts successive reports far enough apart to stay separate pins', () => {
    // The API folds any report within 40m of a hazard into it, so a demo that
    // scattered too tightly would show one pin however many reports it took.
    const a = scatterNear(ORIGIN, 1500, rng(0.9, 0.1));
    const b = scatterNear(ORIGIN, 1500, rng(0.9, 0.6));
    expect(haversineMeters(a, b)).toBeGreaterThan(40);
  });

  it('spreads over the disc rather than crowding the centre', () => {
    // sqrt on the radius is what keeps it uniform by area; without it half the
    // points would fall in the inner quarter of the circle.
    const mid = scatterNear(ORIGIN, 1000, rng(0.25, 0));
    expect(haversineMeters(ORIGIN, mid)).toBeCloseTo(500, 0);
  });
});
