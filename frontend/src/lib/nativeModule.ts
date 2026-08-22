/**
 * Loads a native module that may not exist in the running binary.
 *
 * Expo modules resolve their native counterpart at import time, so importing
 * one that was added to package.json but not yet compiled into the installed
 * dev build throws — and an import that throws inside a route file takes the
 * whole router down with it, which surfaces as an unrelated
 * "Cannot read property 'ErrorBoundary' of undefined".
 *
 * Loading lazily turns that into a state a screen can explain instead.
 */
export function optionalNativeModule<T>(load: () => T): T | null {
  try {
    return load();
  } catch {
    return null;
  }
}

export const REBUILD_HINT =
  'This build does not include that native module yet. Rebuild the app with `npx expo run:ios`.';
