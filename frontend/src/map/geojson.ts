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
