import { Repository } from 'typeorm';
import { haversineMeters, HazardsService, MERGE_RADIUS_M } from './hazards.service';
import { Hazard, HazardKind } from './hazard.entity';
import { Verdict } from '../ai/verdict';

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

describe('the window on a new hazard', () => {
  const repo = () =>
    ({
      create: (h: Partial<Hazard>) => h as Hazard,
      save: (h: Hazard) => Promise.resolve(h),
    }) as unknown as Repository<Hazard>;

  const verdict = (kind: HazardKind): Verdict => ({
    kind,
    dangerLevel: 'moderate',
    confidence: 0.8,
    caption: 'x',
    clearsInDays: null,
    source: 'openai',
  });

  const at = { lng: 150.8931, lat: -34.4278 };

  /**
   * An unlit road used to be stamped 19:00–06:00 on creation. Darkness moves
   * more than three hours across the year here, so that hour was wrong for
   * most of it — the app works darkness out from the sun at the hazard's own
   * position instead, and a stored window would only contradict it.
   */
  it('stores no window for an unlit road — darkness is computed, not stamped', async () => {
    const hazard = await new HazardsService(repo()).createFromVerdict(at, verdict('unlit'));
    expect(hazard.activeWindowStart).toBeNull();
    expect(hazard.activeWindowEnd).toBeNull();
  });

  it('stores no window for any other kind either', async () => {
    const hazard = await new HazardsService(repo()).createFromVerdict(at, verdict('pothole'));
    expect(hazard.activeWindowStart).toBeNull();
    expect(hazard.activeWindowEnd).toBeNull();
  });
});
