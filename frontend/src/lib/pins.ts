import { Hazard } from '../data/types';

/**
 * The two states a pin can show on the map.
 *
 * `unconfirmed` is the interesting one: a rider has submitted a fix photo, but
 * the hazard has not been retired yet — so it still routes as a hazard while
 * reading as "might be done" to anyone looking at the map. Once it is actually
 * retired it stops being drawn at all, rather than lingering as a pin nobody
 * needs to avoid.
 */
export type PinState = 'active' | 'unconfirmed';

export function hazardPinState(h: Hazard): PinState {
  const latest = h.reports[h.reports.length - 1];
  return latest?.intent === 'fix' ? 'unconfirmed' : 'active';
}
