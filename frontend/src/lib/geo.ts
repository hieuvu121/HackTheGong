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
