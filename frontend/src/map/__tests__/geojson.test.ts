import { hazardFeatureCollection, routeFeature, pointFeatureCollection, circleFeatureCollection, unlitRoadCollection } from '../geojson';
import { haversineMeters } from '../../lib/geo';
import { HAZARDS } from '../../data/hazards';
import { ROUTES } from '../../data/routes';
import { danger } from '../../theme/tokens';
import { Hazard } from '../../data/types';

describe('hazardFeatureCollection', () => {
  it('emits one point feature per hazard carrying id and tier', () => {
    const fc = hazardFeatureCollection(HAZARDS.slice(0, 2));
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.type).toBe('Point');
    expect(fc.features[0].properties.id).toBe('hz-1');
    expect(fc.features[0].properties.level).toBe('dangerous');
    expect(fc.features[0].properties.color).toBe('#d6202a');
  });

  it('orders coordinates lng,lat for GeoJSON', () => {
    const fc = hazardFeatureCollection([HAZARDS[0]]);
    expect(fc.features[0].geometry.coordinates).toEqual([150.8955, -34.4241]);
  });
});

describe('routeFeature', () => {
  it('emits a LineString with every geometry point', () => {
    const f = routeFeature(ROUTES[0], true);
    expect(f.geometry.type).toBe('LineString');
    expect(f.geometry.coordinates).toHaveLength(ROUTES[0].geometry.length);
    expect(f.properties.active).toBe(true);
  });

  it('marks inactive routes so they render muted', () => {
    expect(routeFeature(ROUTES[1], false).properties.active).toBe(false);
  });
});

describe('pointFeatureCollection', () => {
  it('renders an empty collection when there is no user location', () => {
    expect(pointFeatureCollection([]).features).toHaveLength(0);
  });

  it('renders the user position as a point', () => {
    const fc = pointFeatureCollection([{ lng: 1, lat: 2 }]);
    expect(fc.features[0].geometry.coordinates).toEqual([1, 2]);
  });
});

describe('circleFeatureCollection', () => {
  const center = { lng: 150.8935, lat: -34.4278 };

  it('closes the ring', () => {
    const [ring] = circleFeatureCollection(center, 75).features[0].geometry.coordinates;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('puts every vertex within a metre of the requested radius', () => {
    const [ring] = circleFeatureCollection(center, 75).features[0].geometry.coordinates;
    for (const [lng, lat] of ring) {
      const d = haversineMeters(center, { lng, lat });
      expect(Math.abs(d - 75)).toBeLessThan(1);
    }
  });

  it('scales with the radius', () => {
    const big = circleFeatureCollection(center, 300).features[0].geometry.coordinates[0];
    expect(haversineMeters(center, { lng: big[0][0], lat: big[0][1] })).toBeCloseTo(300, 0);
  });
});

describe('unlitRoadCollection', () => {
  const road = (over: Partial<Hazard> = {}): Hazard =>
    ({
      id: 'hz-night',
      coord: { lng: 150.8887, lat: -34.4302 },
      kind: 'unlit',
      dangerLevel: 'moderate',
      status: 'active',
      streetName: 'Cliff Rd',
      reports: [],
      ...over,
    }) as Hazard;

  const night = new Date(2026, 5, 21, 21, 0);
  const noon = new Date(2026, 5, 21, 12, 0);

  it('draws the stretch of road, not just the point', () => {
    const fc = unlitRoadCollection([road()], night);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.type).toBe('LineString');
    expect(fc.features[0].geometry.coordinates.length).toBeGreaterThan(1);
  });

  it('marks the road live once it is dark', () => {
    expect(unlitRoadCollection([road()], night).features[0].properties.active).toBe(true);
  });

  /** Still drawn in daylight, so an evening ride can be planned at lunchtime. */
  it('keeps the road but marks it dormant in daylight', () => {
    const fc = unlitRoadCollection([road()], noon);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties.active).toBe(false);
  });

  it('colours it by danger level, the way every other hazard is coloured', () => {
    expect(unlitRoadCollection([road({ dangerLevel: 'dangerous' })], night).features[0].properties.color)
      .toBe(danger.dangerous.color);
  });

  it('draws nothing for hazards that are not unlit roads', () => {
    const pothole = road({ kind: 'pothole', streetName: 'Cliff Rd' });
    expect(unlitRoadCollection([pothole], night).features).toHaveLength(0);
  });

  it('draws nothing for a street with no geometry on file', () => {
    expect(unlitRoadCollection([road({ streetName: 'Nowhere St' })], night).features).toHaveLength(0);
  });

  it('drops a road whose hazard has been fixed', () => {
    expect(unlitRoadCollection([road({ status: 'fixed' })], night).features).toHaveLength(0);
  });
});
