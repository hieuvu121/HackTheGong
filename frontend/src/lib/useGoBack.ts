import { useCallback } from 'react';
import { useRouter } from 'expo-router';

/**
 * Leave the current screen, whether or not there is anything behind it.
 *
 * `router.back()` on its own assumes a history. A screen opened directly — a
 * deep link, a notification, a reload while the app sits on that route — has
 * none, and the call is dropped with "The action 'GO_BACK' was not handled by
 * any navigator", stranding the rider on a screen whose back button does
 * nothing. Falling through to the map always leaves a way out.
 */
export function useGoBack(fallback = '/'): () => void {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
