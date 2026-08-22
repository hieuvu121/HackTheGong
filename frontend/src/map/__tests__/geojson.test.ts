import { hazardFeatureCollection, routeFeature, pointFeatureCollection, circleFeatureCollection } from '../geojson';
import { haversineMeters } from '../../lib/geo';
import { HAZARDS } from '../../data/hazards';
import { ROUTES } from '../../data/routes';

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
