import { Hazard, LngLat, RouteOption } from '../data/types';
import { danger } from '../theme/tokens';

export function hazardFeatureCollection(hazards: Hazard[]) {
  return {
    type: 'FeatureCollection' as const,
    features: hazards.map((h) => ({
      type: 'Feature' as const,
      properties: {
        id: h.id,
        level: h.dangerLevel,
        color: danger[h.dangerLevel].color,
        kind: h.kind,
      },
      geometry: { type: 'Point' as const, coordinates: [h.coord.lng, h.coord.lat] },
    })),
  };
}

export function routeFeature(route: RouteOption, active: boolean) {
  return {
    type: 'Feature' as const,
    properties: { id: route.id, active },
    geometry: {
      type: 'LineString' as const,
      coordinates: route.geometry.map((p) => [p.lng, p.lat]),
    },
  };
}

export function pointFeatureCollection(points: LngLat[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((p) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
    })),
  };
}

/**
 * The report geofence, as a polygon. MapLibre has no metric circle primitive,
 * so the radius is walked out in steps and corrected for latitude.
 */
export function circleFeatureCollection(center: LngLat, radiusM: number, steps = 64) {
  const latM = 111_320;
  const lngM = latM * Math.cos((center.lat * Math.PI) / 180);
  const ring: [number, number][] = [];

  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * 2 * Math.PI;
    ring.push([
      center.lng + ((radiusM * Math.cos(angle)) / lngM),
      center.lat + ((radiusM * Math.sin(angle)) / latM),
    ]);
  }

  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
      },
    ],
  };
}
