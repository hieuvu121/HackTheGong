# CycleSafe

Safer cycling routes, built from hazards other riders have already found.

A UI draft: real screens, real navigation, real logic. Hazard, route and place data are fixtures — there is no backend and no model inference.

## Running it

### iOS (primary target)

```bash
npx expo run:ios                          # builds and launches a simulator
npx expo run:ios --device "iPhone 17 Pro" # pick a specific one
```

The first build takes several minutes. After that, `npm start` then press `i` — JS hot-reloads normally.

**Expo Go will not work.** `@maplibre/maplibre-react-native` contains native code Expo Go does not bundle. Launching in Expo Go crashes immediately with:

```
Invariant Violation: TurboModuleRegistry.getEnforcing(...):
'MLRNCameraModule' could not be found
```

followed by a cascade of "Route ... is missing the required default export" warnings — those are fallout from the failed import, not separate problems.

`npm start` runs `expo start --dev-client` so it targets the dev build. If you ever launch bare `expo start` and see `› Using Expo Go` in the header, press **`s`** to switch to the development build, then `i`.

**Prerequisite — CocoaPods.** macOS system Ruby is 2.6, too old for current CocoaPods, so `gem install` fails or hangs on a sudo prompt. Install it through Homebrew instead:

```bash
brew install cocoapods
```

**If the build fails with `resource fork, Finder information, or similar detritus not allowed`:**

```bash
xattr -cr node_modules/expo-modules-jsi/apple
```

This repo lives under `~/Documents`, which is iCloud-synced. iCloud tags files with `com.apple.FinderInfo` and `com.apple.fileprovider.fpfs#P` extended attributes, and `codesign` refuses to sign anything carrying them — so the `ExpoModulesJSI` framework fails to sign and the build dies. The real error is buried under thousands of harmless `jsi.h` umbrella-header warnings, so search the log for `CodeSign failed` rather than reading from the top.

Clearing the attributes is not enough on its own: the framework is *built into* `node_modules/expo-modules-jsi/apple/.DerivedData`, which is itself inside iCloud, so every rebuild re-tags it. Redirect that build output outside iCloud instead:

```bash
A=node_modules/expo-modules-jsi/apple
rm -rf "$A/.DerivedData"
ln -s ~/Library/Caches/expo-modules-jsi-derived "$A/.DerivedData"
mkdir -p ~/Library/Caches/expo-modules-jsi-derived
```

**`npm install` wipes this symlink** — re-run it if the codesign error comes back. The permanent fix is moving the repo outside iCloud (e.g. `~/dev/`), which removes the whole class of problem.

**If the build fails with `no member named 'executeSync' in 'worklets::WorkletRuntime'`:**

`react-native-reanimated` and `react-native-worklets` are pinned as direct dependencies on purpose. They arrive transitively via `expo-router`, and left alone npm resolves `react-native-worklets@0.12.x` — which `expo-modules-core` does not accept (`^0.7.4 || ^0.8.0 || ^0.9.0 || ^0.10.0`), because `executeSync` was removed in 0.12. Fix:

```bash
npx expo install react-native-reanimated react-native-worklets
npm ls react-native-worklets   # must not print "invalid"
```

### Web

```bash
npm run web
```

Useful for fast iteration — no native build, instant reload.

### Tests

```bash
npm test          # 95 tests
npx tsc --noEmit  # typecheck
```

## Layout

```
app/            screens (Expo Router file-based routes)
src/theme/      DESIGN.md tokens — never hardcode a hex or radius
src/data/       domain types + fixtures
src/lib/        pure logic: geo gating, time windows, hazard scoring
src/map/        platform-split map behind one props interface
src/components/ UI primitives
docs/superpowers/  spec and implementation plan
```

## Things worth knowing before you change anything

**The map is platform-split.** `MapView.web.tsx` uses `maplibre-gl`; `MapView.native.tsx` uses `@maplibre/maplibre-react-native`. Both load the same Positron style and declare the same layer ids and paint expressions, so the map looks identical on both. Screens import `src/map/MapView` and never know which they got.

**`maplibre-gl` is pinned to v5 deliberately.** v6 is ESM-only with a separate module worker that Metro cannot emit. The symptom is nasty: the map renders its chrome, fetches the style and sprite, and then silently loads zero tiles with no error anywhere. Do not upgrade without confirming tiles actually appear.

**Hazards are time-aware.** An unlit road is only a hazard inside its `activeWindow`, so route hazard counts change with departure time. The "Leaving now ▾" chip on the map toggles to 21:00 to demo this.

**Reports are GPS-gated.** Submission is hard-blocked outside 75m of the hazard, with a live distance readout. `report/gate` has a simulate button so both states are demoable.

**`ios/` and `android/` are generated** by prebuild and gitignored. Never edit them by hand — change `app.json` and re-run.

## Not built

Backend, auth, real AI inference, live directions, offline maps, background GPS, voice guidance. "Report incorrect" and "Change the rating" render but do nothing. Android is untested — no SDK on the dev machine.
