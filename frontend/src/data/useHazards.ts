import { useCallback, useEffect, useState } from 'react';
import { Hazard } from './types';
import { HAZARDS } from './hazards';
import { fetchHazards } from '../api/client';

export type HazardSource = 'api' | 'fixtures';

export interface HazardsState {
  hazards: Hazard[];
  source: HazardSource;
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * Hazards from the API, falling back to the bundled fixtures when it cannot be
 * reached. The fallback is what keeps the app demoable on a laptop with no
 * backend running; `source` says which one you are looking at.
 *
 * Route planning still reads the fixtures directly — `ROUTES` references
 * fixture hazard ids, so the two cannot be mixed until routing is server-side.
 */
export function useHazards(): HazardsState {
  const [hazards, setHazards] = useState<Hazard[]>(HAZARDS);
  const [source, setSource] = useState<HazardSource>('fixtures');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const remote = await fetchHazards();
      setHazards(remote);
      setSource('api');
    } catch {
      setHazards(HAZARDS);
      setSource('fixtures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { hazards, source, loading, reload };
}
