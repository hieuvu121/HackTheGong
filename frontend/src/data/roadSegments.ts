import { LngLat } from './types';

/**
 * The stretch of road a hazard covers, for the streets in the demo.
 *
 * Demo scaffolding, and deliberately shallow: a hazard knows only the point it
 * was photographed from, and a rider looking at an unlit road needs to see how
 * far the dark bit runs. Real geometry belongs to the routing engine — when
 * routing moves server-side, the road a hazard sits on comes back with it and
 * this file goes away.
 *
 * Keyed by street name so it works whether hazards come from the API or the
 * bundled fixtures; a street with no entry simply draws no road.
 */
export const ROAD_SEGMENTS: Record<string, LngLat[]> = {
  // Along the foreshore, past the unlit stretch on the seed map.
  'Cliff Rd': [
    { lng: 150.8896, lat: -34.4299 },
    { lng: 150.8887, lat: -34.4302 },
    { lng: 150.8879, lat: -34.4318 },
    { lng: 150.8884, lat: -34.4327 },
  ],
  // The northern approach, unlit past the industrial edge.
  'Squires Way': [
    { lng: 150.8968, lat: -34.4056 },
    { lng: 150.8951, lat: -34.4079 },
    { lng: 150.8942, lat: -34.4102 },
  ],
  'Crown St': [
    { lng: 150.8938, lat: -34.4246 },
    { lng: 150.8955, lat: -34.4241 },
    { lng: 150.8974, lat: -34.4236 },
  ],
  'Keira St': [
    { lng: 150.9002, lat: -34.4278 },
    { lng: 150.9012, lat: -34.4265 },
    { lng: 150.9021, lat: -34.4249 },
  ],
};

export const roadSegmentFor = (streetName: string): LngLat[] | undefined =>
  ROAD_SEGMENTS[streetName];
