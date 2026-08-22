# CycleSafe

Safer cycling routes, built from hazards other riders have already found.

A UI draft: real screens, real navigation, real logic. Hazard, route and place data are fixtures — there is no backend and no model inference.

## Running it

The app needs the API for reporting. Start it first:

```bash
cd ../backend && npm install && cp .env.example .env && npm run dev
```

See [../backend/README.md](../backend/README.md). Without it the map falls back
to bundled fixtures and the report flow cannot submit — `src/data/useHazards.ts`
says which source you are looking at.

**Point the app at the API** with `EXPO_PUBLIC_API_URL` if it isn't on
`localhost:3000`. On a simulator the default works; on a physical phone the app
reuses the LAN address Metro is already serving from.

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
npm test          # 154 tests
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

**The map is platform-split.** `MapView.web.tsx` uses `maplibre-gl`; `MapView.native.tsx` uses `@maplibre/maplibre-react-native`. Both load the same Positron style and declare the same route and user-location layer ids and paint expressions, so the map looks identical on both. Screens import `src/map/MapView` and never know which they got.

**Hazard pins are React views, not map layers.** A circle layer cannot host a glyph or an animation, so each hazard is a marker wrapping `HazardPin` — native via `Marker`, web via a `maplibregl.Marker` with the same component portalled into its element. Two markers, one component, identical output.

**The radar ping cannot use `Animated.delay`.** `RadarPing` staggers its rings by holding each ring's own value with a same-driver `timing`. `Animated.delay` hardcodes `useNativeDriver: false`, and mixing drivers inside one sequence silently stops the whole animation — the rings render at their resting size and never move, which looks like a styling bug rather than an animation one.

**A hazard whose newest report is a fix goes dotted, not away.** `hazardPinState` reads the last report's intent: `fix` means "might be done", drawn hollow and dotted in amber while still routing as a hazard. Only `status: 'fixed'` retires it, and retired hazards are filtered out of the map entirely rather than drawn in a third style.

**`maplibre-gl` is pinned to v5 deliberately.** v6 is ESM-only with a separate module worker that Metro cannot emit. The symptom is nasty: the map renders its chrome, fetches the style and sprite, and then silently loads zero tiles with no error anywhere. Do not upgrade without confirming tiles actually appear.

**Hazards are time-aware.** An unlit road is only a hazard inside its `activeWindow`, so route hazard counts change with departure time. The "Leaving now ▾" chip on the map toggles to 21:00 to demo this.

**Photos are real, and so is the classification.** `report/capture` takes a
photo or attaches one from the library (`expo-image-picker`), `POST /api/analyze`
classifies it, and `POST /api/reports` stores photo, position and verdict in
SQLite. The confidence shown is the model's own estimate — labelled as such,
because it is not a calibrated probability.

**The GPS gate only guards the fix flow.** A new report is filed wherever the
rider is standing, so there is nothing to check it against: the photo and its
coordinates are the evidence. Marking someone else's hazard fixed is the case
that needs proof of presence, and that check uses a real fix from
`expo-location` — there is no way to fake it from inside the app. Submission is hard-blocked outside 75m of the hazard, and the gate runs first — checking after the photo meant a blocked rider had already taken one. The screen draws the radius on a map rather than only asserting it in copy. `report/gate` has a simulate button, marked as demo scaffolding, so both states are demoable.

**Nothing pushes where it should replace.** Choosing a destination replaces the search modal, finishing a report calls `dismissAll`, and onboarding replaces itself with the map. Pushing left the search modal under the whole ride flow, and put a second map on top of the report stack — Android back then re-showed "Report submitted". Every screen that isn't the map also draws its own `NavButton`, because headers are off globally.

**"Safest" is only claimed when it's true.** Two routes carrying the same hazards are not distinguishable on safety, so `isStrictlySafest` awards the badge only to a strictly lowest score; ties fall back to "Recommended". This flips with departure time — after 19:00 the unlit hazard levels two of the three routes.

**Onboarding runs on first launch and teaches the pin language.** `src/lib/firstRun.ts` is session-scoped, not persisted: there is no storage layer, so it resets on a cold start rather than pretending otherwise.

**Three token colours deviate from DESIGN.md, for contrast.** `mute`, `danger.moderate` and `danger.low` are darkened; at the documented values a white pin glyph sat at 2.03:1 and placeholder text at 2.19:1. `tokens.test.ts` holds every safety colour to 3:1 under a white glyph.

**`ios/` and `android/` are generated** by prebuild and gitignored. Never edit them by hand — change `app.json` and re-run.

## Not built

Auth, live directions, offline maps, background GPS, voice guidance. Route
planning still reads the bundled fixtures — `ROUTES` references fixture hazard
ids, so routing and the live hazard list cannot be mixed until routing moves
server-side. Onboarding names the permissions it wants but never requests them. Android is untested — no SDK on the dev machine.
