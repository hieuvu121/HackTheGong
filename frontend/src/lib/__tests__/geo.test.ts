import { haversineMeters, checkGate, GATE_RADIUS_M } from '../geo';

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
