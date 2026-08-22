import { optionalNativeModule, REBUILD_HINT } from '../nativeModule';

describe('optionalNativeModule', () => {
  it('returns the module when it loads', () => {
    expect(optionalNativeModule(() => ({ ok: true }))).toEqual({ ok: true });
  });

  it('returns null instead of throwing when the native side is missing', () => {
    // This is the whole point: an import that throws inside a route file takes
    // the router down and surfaces as an unrelated ErrorBoundary error.
    expect(
      optionalNativeModule(() => {
        throw new Error("Cannot find native module 'ExpoLocation'");
      }),
    ).toBeNull();
  });

  it('tells the developer how to fix it', () => {
    expect(REBUILD_HINT).toMatch(/expo run:ios/);
  });
});
