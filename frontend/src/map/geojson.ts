import { Hazard, LngLat, RouteOption } from '../data/types';
import { roadSegmentFor } from '../data/roadSegments';
import { isHazardActiveAt } from '../lib/time';
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

/**
 * The stretches of road that go dark, as lines under the pins.
 *
 * A pin marks a point; an unlit road is a length of it, and the length is what
 * a rider needs to see before deciding to take it. Drawn in daylight too, but
 * marked dormant so it can be dimmed — a rider planning an evening ride at
 * lunchtime still wants to know which streets go dark.
 *
 * Only unlit hazards. Every other kind really is a point, and drawing a whole
 * street bold for one pothole would overstate it.
 */
export function unlitRoadCollection(hazards: Hazard[], at: Date) {
  const features = hazards
    .filter((h) => h.kind === 'unlit' && h.status !== 'fixed')
    .map((h) => ({ hazard: h, line: roadSegmentFor(h.streetName) }))
    .filter((r): r is { hazard: Hazard; line: LngLat[] } => Boolean(r.line))
    .map(({ hazard, line }) => ({
      type: 'Feature' as const,
      properties: {
        id: hazard.id,
        color: danger[hazard.dangerLevel].color,
        active: isHazardActiveAt(hazard, at),
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: line.map((p) => [p.lng, p.lat]),
      },
    }));

  return { type: 'FeatureCollection' as const, features };
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
