import { haversineMeters, MERGE_RADIUS_M } from './hazards.service';

const crown = { lng: 150.8955, lat: -34.4241 };

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters(crown, crown)).toBeCloseTo(0, 5);
  });

  it('measures a known short hop within a metre', () => {
    // ~0.001 degrees of latitude is ~111 m.
    const north = { lng: crown.lng, lat: crown.lat + 0.001 };
    expect(haversineMeters(crown, north)).toBeGreaterThan(110);
    expect(haversineMeters(crown, north)).toBeLessThan(112);
  });

  it('is symmetric', () => {
    const other = { lng: 150.9012, lat: -34.4265 };
    expect(haversineMeters(crown, other)).toBeCloseTo(haversineMeters(other, crown), 6);
  });
});

describe('merge radius', () => {
  it('treats a few metres apart as the same hazard', () => {
    const nudged = { lng: crown.lng + 0.00002, lat: crown.lat + 0.00002 };
    expect(haversineMeters(crown, nudged)).toBeLessThan(MERGE_RADIUS_M);
  });

  it('treats a block away as a different hazard', () => {
    const block = { lng: crown.lng + 0.002, lat: crown.lat };
    expect(haversineMeters(crown, block)).toBeGreaterThan(MERGE_RADIUS_M);
  });
});
