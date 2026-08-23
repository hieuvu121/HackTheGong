import { useCallback, useEffect, useState } from 'react';
import type * as LocationTypes from 'expo-location';
import { LngLat } from '../data/types';
import { ORIGIN } from '../data/locale';
import { scatterNear } from './geo';
import { optionalNativeModule } from './nativeModule';

// Loaded lazily: see optionalNativeModule. A dev build compiled before
// expo-location was added would otherwise crash the router on import.
const Location = optionalNativeModule<typeof LocationTypes>(() => require('expo-location'));

export type LocationStatus =
  | 'pending'
  | 'granted'
  | 'denied'
  /** The device could not produce a fix. */
  | 'unavailable'
  /** This build has no location module compiled in — it needs rebuilding. */
  | 'unsupported'
  /** Synthetic: EXPO_PUBLIC_DEMO_LOCATION is on and the device was not asked. */
  | 'demo';

export interface LocationState {
  status: LocationStatus;
  coord: LngLat | null;
  accuracyM: number | null;
  refresh: () => Promise<void>;
}

/** How far a stand-in position may wander from the demo origin. */
export const DEMO_SCATTER_M = 1500;

/**
 * Force every position near the demo origin, ignoring the device entirely.
 *
 * For demoing off a simulator, which reports a perfectly valid fix in San
 * Francisco and drops every report 26,000km off the map. Opt-in on purpose:
 * this app gates "report as fixed" on the rider standing within 75m of the
 * hazard, and a synthetic position defeats that check, so it must never turn
 * itself on. `status` reports 'demo' so no screen can mistake it for a fix.
 */
export const usingDemoLocation = (): boolean =>
  process.env.EXPO_PUBLIC_DEMO_LOCATION === '1' ||
  process.env.EXPO_PUBLIC_DEMO_LOCATION === 'true';

/**
 * The rider's real position.
 *
 * Falls back to a point near the demo origin only when the device refuses — a
 * simulator with no location set would otherwise leave the report flow dead in
 * the water. `status` always says which of the two you are looking at.
 *
 * Scattered rather than pinned to the origin: the API merges any report within
 * 40m into the hazard already there, so identical fallbacks made every demo
 * report after the first vanish into the same pin.
 */
export function useLocation(): LocationState {
  const [status, setStatus] = useState<LocationStatus>('pending');
  const [coord, setCoord] = useState<LngLat | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (usingDemoLocation()) {
      setStatus('demo');
      setCoord(scatterNear(ORIGIN, DEMO_SCATTER_M));
      return;
    }

    if (!Location) {
      setStatus('unsupported');
      setCoord(scatterNear(ORIGIN, DEMO_SCATTER_M));
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus('denied');
        setCoord(scatterNear(ORIGIN, DEMO_SCATTER_M));
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoord({ lng: position.coords.longitude, lat: position.coords.latitude });
      setAccuracyM(position.coords.accuracy ?? null);
      setStatus('granted');
    } catch {
      setStatus('unavailable');
      setCoord(scatterNear(ORIGIN, DEMO_SCATTER_M));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, coord, accuracyM, refresh };
}
