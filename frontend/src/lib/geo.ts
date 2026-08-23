import { LngLat } from '../data/types';

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Hard block radius for the report GPS gate. */
export const GATE_RADIUS_M = 75;

export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function checkGate(user: LngLat, target: LngLat) {
  const distanceM = Math.round(haversineMeters(user, target));
  return { withinRange: distanceM <= GATE_RADIUS_M, distanceM };
}

/**
 * Initial great-circle bearing from `a` to `b`, in degrees clockwise from
 * north. Used to point the navigation camera the way the rider is travelling,
 * and to work out which side of them a hazard sits on.
 */
export function bearingBetween(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Signed difference between two bearings, in (-180, 180]. */
export function bearingDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/**
 * A random point within `radiusM` of `origin`.
 *
 * The demo needs somewhere plausible to put a report when the device will not
 * give up a real fix — a simulator, or a denied permission. Dropping every one
 * on the origin exactly meant the API's 40m merge radius folded them all into
 * a single pin, so the second report of a demo never appeared.
 *
 * Uniform by area: the radius is scaled by sqrt, without which points crowd
 * the centre. `rng` is injectable so the spread can be tested.
 */
export function scatterNear(origin: LngLat, radiusM: number, rng = Math.random): LngLat {
  const distance = radiusM * Math.sqrt(rng());
  const bearing = 2 * Math.PI * rng();

  // Metres per degree: latitude is constant, longitude shrinks toward the poles.
  const latM = (EARTH_RADIUS_M * Math.PI) / 180;
  const lngM = latM * Math.cos(toRad(origin.lat));

  return {
    lng: origin.lng + (distance * Math.sin(bearing)) / lngM,
    lat: origin.lat + (distance * Math.cos(bearing)) / latM,
  };
}
