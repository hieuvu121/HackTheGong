import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Hazard } from './types';
import { HAZARDS } from './hazards';
import { fetchHazards } from '../api/client';

export type HazardSource = 'api' | 'fixtures';

export interface HazardsState {
  hazards: Hazard[];
  source: HazardSource;
  /** True until the first fetch settles, either way. */
  loading: boolean;
  reload: () => Promise<void>;
}

interface Snapshot {
  hazards: Hazard[];
  source: HazardSource;
  loading: boolean;
}

/**
 * One shared hazard list for the whole app.
 *
 * This used to fetch per component, which meant the map and the hazard sheet
 * could resolve to different sources — the map showing API hazards with uuid
 * ids while the sheet fell back to fixtures with `hz-` ids. Tapping a pin then
 * looked up an id that list had never heard of, and the sheet claimed the
 * hazard no longer existed. A single store makes that unrepresentable, and
 * collapses four fetches into one.
 */
let snapshot: Snapshot = { hazards: HAZARDS, source: 'fixtures', loading: true };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Partial<Snapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Concurrent callers share one request rather than racing each other. */
function load(): Promise<void> {
  if (inFlight) return inFlight;

  set({ loading: true });
  inFlight = fetchHazards()
    .then((remote) => set({ hazards: remote, source: 'api' }))
    .catch(() => set({ hazards: HAZARDS, source: 'fixtures' }))
    .finally(() => {
      set({ loading: false });
      inFlight = null;
    });

  return inFlight;
}

/** Test seam: drop back to the initial state. */
export function resetHazardStore(): void {
  snapshot = { hazards: HAZARDS, source: 'fixtures', loading: true };
  inFlight = null;
}

export function useHazards(): HazardsState {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );

  useEffect(() => {
    // Only the first mount triggers a fetch; later screens read the same list.
    if (state.loading && !inFlight) void load();
  }, [state.loading]);

  const reload = useCallback(() => load(), []);

  return { ...state, reload };
}

/**
 * Resolve one hazard by id, from the live list or the bundled fixtures.
 *
 * Both are needed because route planning is still fixture-based: `ROUTES`
 * references `hz-` ids, so the pins drawn on the route and navigation screens
 * carry fixture ids while the map carries whatever the API returned. Looking
 * in only one place made those pins open a sheet claiming the hazard no longer
 * existed. This collapses back to a single lookup once routing moves
 * server-side and every id comes from the same place.
 */
export function useHazard(id?: string): { hazard: Hazard | undefined; loading: boolean } {
  const { hazards, loading } = useHazards();

  const hazard = useMemo(() => {
    if (!id) return undefined;
    return hazards.find((h) => h.id === id) ?? HAZARDS.find((h) => h.id === id);
  }, [hazards, id]);

  return { hazard, loading };
}
