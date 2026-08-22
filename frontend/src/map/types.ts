import { Hazard, LngLat, RouteOption } from '../data/types';

export interface MapViewProps {
  center: LngLat;
  zoom?: number;
  hazards?: Hazard[];
  routes?: RouteOption[];
  activeRouteId?: string;
  userLocation?: LngLat;
  onHazardPress?: (id: string) => void;
  followBearing?: number;
  /**
   * Drive the camera from `center`/`zoom` on every change (navigation).
   * When false, those are treated as the initial view only, so the rider's
   * own pan and pinch are never yanked back.
   */
  follow?: boolean;
  /** Frame these coordinates instead of honouring `center`/`zoom`. */
  fitTo?: LngLat[];
  /** Screen-space insets for `fitTo`, so a bottom sheet doesn't cover the route. */
  fitPadding?: { top: number; bottom: number; left: number; right: number };
  style?: object;
}

/** Keyless greyscale basemap — lands close to DESIGN.md's mono system. */
export const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
