# CycleSafe UI Draft — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive 11-screen mobile UI draft for a cyclist safe-routing app — real navigation and interactions, mocked data.

**Architecture:** Expo Router file-based routing over React Native Web. All hazard/route/place data is static fixtures; all pure logic (distance gating, time-of-day hazard activity, route hazard scoring) is real and test-driven. The map is the single platform-split module behind one props interface, so the MapLibre→Mapbox swap never touches a screen.

**Tech Stack:** Expo SDK 54, Expo Router, TypeScript, React Native Web, MapLibre GL JS v5, OpenFreeMap `positron` tiles (keyless), jest-expo, @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-08-22-cyclesafe-ui-draft-design.md`

## Global Constraints

- **Design tokens come from `DESIGN.md` verbatim.** Never hardcode a hex, size, or radius in a component — import from `src/theme/tokens.ts`.
- **Black-and-white only for chrome.** The 3-tone safety accent (`#d6202a` / `#f5a623` / `#1a9e5a`) appears **only** on hazard pins, danger badges, and confidence bars. Buttons and CTAs are always black `#000000`.
- **Every interactive element is `borderRadius: 999`.** Cards are `16`. Inputs are `8`. The only exception is `button-large-rounded` at `16`.
- **Headlines are sentence-case, weight 700. Never all-caps. Never letter-spaced.**
- **No API keys anywhere.** If a step needs a key, it is the wrong step.
- **Mock locale is Wollongong NSW** — `{ lng: 150.8931, lat: -34.4278 }`, defined once in `src/data/locale.ts`.
- **Node 26, npm 11.** Package manager is npm.
- Commit after every task. Conventional commit prefixes (`feat:`, `test:`, `chore:`).

---

## File Structure

```
app/
  _layout.tsx                 root Stack + font loading
  onboarding.tsx              permission priming
  (tabs)/_layout.tsx          bottom tab bar
  (tabs)/index.tsx            home map
  (tabs)/reports.tsx          my reports
  search.tsx                  destination autocomplete
  routes.tsx                  route selection
  navigate.tsx                turn-by-turn
  hazard/[id].tsx             hazard detail modal
  report/capture.tsx
  report/gate.tsx
  report/analysis.tsx
  report/done.tsx
src/
  theme/tokens.ts             colours, spacing, radii, shadows, danger palette
  theme/type.ts               typography styles
  data/types.ts               domain types
  data/locale.ts              map centre constant
  data/hazards.ts             hazard fixtures
  data/routes.ts              route fixtures
  data/places.ts              place fixtures
  lib/geo.ts                  haversine, GPS gate
  lib/time.ts                 time windows, hazard activity
  lib/scoring.ts              route hazard scoring
  lib/fakeAI.ts               scripted AI verdict
  map/types.ts                shared MapView props
  map/MapView.web.tsx         MapLibre GL JS
  map/MapView.native.tsx      native stub
  components/Button.tsx
  components/Chip.tsx
  components/Card.tsx
  components/Sheet.tsx
  components/DangerBadge.tsx
  components/ConfidenceBar.tsx
  components/RouteCard.tsx
  components/PhotoCarousel.tsx
  components/ManeuverBanner.tsx
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `jest.config.js`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`
- Test: `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a booting Expo Router app on web; `npm test` runs jest-expo

- [ ] **Step 1: Scaffold Expo into the existing directory**

The repo already has `package.json` and `index.js` from a bare npm init. Remove them first — `create-expo` needs a clean slate.

```bash
cd /Users/mac/Documents/Project/HackTheGong
rm -f index.js package.json
npx create-expo@latest . --template tabs --no-install
npm install
```

- [ ] **Step 2: Add web + test dependencies**

```bash
npx expo install react-dom react-native-web @expo/metro-runtime
npm install --save-dev jest jest-expo @testing-library/react-native @types/jest
npm install maplibre-gl
```

- [ ] **Step 3: Configure jest**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|maplibre-gl)',
  ],
};
```

Add to `package.json` scripts:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 4: Write a smoke test**

Create `src/lib/__tests__/smoke.test.ts`:

```ts
describe('toolchain', () => {
  it('runs typescript tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test**

Run: `npm test`
Expected: PASS, 1 test

- [ ] **Step 6: Verify the app boots on web**

Run: `npx expo start --web`
Expected: browser opens, tabs template renders. Ctrl-C to stop.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold expo router app with web and jest"
```

---

### Task 2: Design tokens

**Files:**
- Create: `src/theme/tokens.ts`, `src/theme/type.ts`
- Test: `src/theme/__tests__/tokens.test.ts`

**Interfaces:**
- Consumes: `DESIGN.md`
- Produces: `colors`, `spacing`, `radii`, `shadows`, `danger` from `tokens.ts`; `type` from `type.ts`

- [ ] **Step 1: Write the failing test**

Create `src/theme/__tests__/tokens.test.ts`:

```ts
import { colors, radii, spacing, danger } from '../tokens';
import { type as t } from '../type';

describe('design tokens', () => {
  it('matches DESIGN.md colour values', () => {
    expect(colors.primary).toBe('#000000');
    expect(colors.canvasSoft).toBe('#efefef');
    expect(colors.body).toBe('#5e5e5e');
    expect(colors.mute).toBe('#afafaf');
  });

  it('uses the pill as the interactive radius', () => {
    expect(radii.pill).toBe(999);
    expect(radii.xl).toBe(16);
    expect(radii.md).toBe(8);
  });

  it('exposes the 3-tone safety accent separately from chrome', () => {
    expect(danger.dangerous.color).toBe('#d6202a');
    expect(danger.moderate.color).toBe('#f5a623');
    expect(danger.low.color).toBe('#1a9e5a');
  });

  it('sets display type at weight 700 and body at 400/500', () => {
    expect(t.displayXl.fontWeight).toBe('700');
    expect(t.bodyMd.fontWeight).toBe('400');
    expect(t.buttonMd.fontWeight).toBe('500');
  });

  it('keeps 4px spacing rhythm', () => {
    expect(spacing.lg).toBe(16);
    expect(spacing.xxl).toBe(24);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tokens`
Expected: FAIL, "Cannot find module '../tokens'"

- [ ] **Step 3: Write the tokens**

Create `src/theme/tokens.ts`:

```ts
export const colors = {
  primary: '#000000',
  onPrimary: '#ffffff',
  ink: '#000000',
  body: '#5e5e5e',
  mute: '#afafaf',
  hairlineMid: '#4b4b4b',
  canvas: '#ffffff',
  canvasSoft: '#efefef',
  canvasSofter: '#f3f3f3',
  surfacePressed: '#e2e2e2',
  link: '#0000ee',
  onDark: '#ffffff',
  blackElevated: '#282828',
} as const;

export const spacing = {
  xxs: 4, xs: 6, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

export const radii = {
  none: 0, md: 8, lg: 12, xl: 16, pill: 999, pillTab: 36, full: 9999,
} as const;

export const shadows = {
  level1: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  level2: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  level3: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 8,  shadowOffset: { width: 0, height: 2 }, elevation: 4 },
} as const;

// The single deliberate deviation from DESIGN.md's mono rule.
// Used ONLY on hazard pins, danger badges, confidence bars. Never on CTAs.
export const danger = {
  dangerous: { color: '#d6202a', label: 'Dangerous', fill: 'solid'   as const },
  moderate:  { color: '#f5a623', label: 'Moderate',  fill: 'half'    as const },
  low:       { color: '#1a9e5a', label: 'Low risk',  fill: 'outline' as const },
} as const;
```

- [ ] **Step 4: Write the typography**

Create `src/theme/type.ts`:

```ts
import { TextStyle } from 'react-native';

const display = 'Inter_700Bold, system-ui, Helvetica Neue, Arial, sans-serif';
const text = 'Inter_400Regular, system-ui, Helvetica Neue, Arial, sans-serif';

export const type = {
  displayXxl:   { fontFamily: display, fontSize: 52, fontWeight: '700', lineHeight: 64 },
  displayXl:    { fontFamily: display, fontSize: 36, fontWeight: '700', lineHeight: 44 },
  displayLg:    { fontFamily: display, fontSize: 32, fontWeight: '700', lineHeight: 40 },
  displayMd:    { fontFamily: display, fontSize: 24, fontWeight: '700', lineHeight: 32 },
  displaySm:    { fontFamily: display, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  bodyLg:       { fontFamily: text, fontSize: 18, fontWeight: '500', lineHeight: 24 },
  bodyMd:       { fontFamily: text, fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMdStrong: { fontFamily: text, fontSize: 16, fontWeight: '500', lineHeight: 20 },
  bodySm:       { fontFamily: text, fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySmStrong: { fontFamily: text, fontSize: 14, fontWeight: '500', lineHeight: 16 },
  caption:      { fontFamily: text, fontSize: 12, fontWeight: '400', lineHeight: 20 },
  buttonLarge:  { fontFamily: text, fontSize: 18, fontWeight: '500', lineHeight: 24 },
  buttonMd:     { fontFamily: text, fontSize: 16, fontWeight: '500', lineHeight: 20 },
} satisfies Record<string, TextStyle>;
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tokens`
Expected: PASS, 5 tests

- [ ] **Step 6: Commit**

```bash
git add src/theme
git commit -m "feat: add design tokens and typography from DESIGN.md"
```

---

### Task 3: Domain types and fixtures

**Files:**
- Create: `src/data/types.ts`, `src/data/locale.ts`, `src/data/hazards.ts`, `src/data/routes.ts`, `src/data/places.ts`
- Test: `src/data/__tests__/fixtures.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: types `LngLat`, `TimeWindow`, `DangerLevel`, `HazardStatus`, `HazardKind`, `AIVerdict`, `HazardReport`, `Hazard`, `ManeuverStep`, `RouteOption`; fixtures `HAZARDS: Hazard[]`, `ROUTES: RouteOption[]`, `PLACES: Place[]`, `ORIGIN: LngLat`

- [ ] **Step 1: Write the failing test**

Create `src/data/__tests__/fixtures.test.ts`:

```ts
import { HAZARDS } from '../hazards';
import { ROUTES } from '../routes';
import { PLACES } from '../places';

describe('fixtures', () => {
  it('has three route options', () => {
    expect(ROUTES).toHaveLength(3);
  });

  it('gives every route a geometry and steps ending in arrive', () => {
    for (const r of ROUTES) {
      expect(r.geometry.length).toBeGreaterThan(3);
      expect(r.steps[r.steps.length - 1].modifier).toBe('arrive');
    }
  });

  it('references only real hazard ids from routes', () => {
    const ids = new Set(HAZARDS.map((h) => h.id));
    for (const r of ROUTES) {
      for (const hid of r.hazardIds) expect(ids.has(hid)).toBe(true);
    }
  });

  it('gives unlit hazards an active window and others none', () => {
    for (const h of HAZARDS) {
      if (h.kind === 'unlit') expect(h.activeWindow).toBeDefined();
      else expect(h.activeWindow).toBeUndefined();
    }
  });

  it('orders each hazard report list oldest first', () => {
    for (const h of HAZARDS) {
      const times = h.reports.map((r) => Date.parse(r.reportedAt));
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
  });

  it('includes at least one fixed hazard and one multi-report hazard', () => {
    expect(HAZARDS.some((h) => h.status === 'fixed')).toBe(true);
    expect(HAZARDS.some((h) => h.reports.length > 1)).toBe(true);
  });

  it('has searchable places', () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- fixtures`
Expected: FAIL, "Cannot find module '../hazards'"

- [ ] **Step 3: Write the types**

Create `src/data/types.ts`:

```ts
export type DangerLevel  = 'dangerous' | 'moderate' | 'low';
export type HazardStatus = 'active' | 'fixed';
export type HazardKind   = 'construction' | 'unlit' | 'pothole' | 'highway' | 'debris' | 'no_bike_lane';

export interface LngLat { lng: number; lat: number }

/** Minutes from midnight. Wraps when startMin > endMin (e.g. 19:00–06:00). */
export interface TimeWindow { startMin: number; endMin: number }

export interface AIVerdict {
  kind: HazardKind;
  dangerLevel: DangerLevel;
  confidence: number;   // 0..1, surfaced to the user
  caption: string;
}

export interface HazardReport {
  id: string;
  hazardId: string;
  photo: string;
  reportedAt: string;   // ISO
  reporterName: string;
  intent: 'report' | 'fix';
  ai: AIVerdict;
}

export interface Hazard {
  id: string;
  coord: LngLat;
  kind: HazardKind;
  dangerLevel: DangerLevel;
  status: HazardStatus;
  activeWindow?: TimeWindow;
  reports: HazardReport[];   // oldest first
  streetName: string;
}

export interface ManeuverStep {
  id: string;
  instruction: string;
  modifier: 'left' | 'right' | 'straight' | 'slight-left' | 'slight-right' | 'arrive';
  distanceM: number;
  atIndex: number;           // index into RouteOption.geometry
}

export interface RouteOption {
  id: string;
  label: string;
  durationMin: number;
  distanceKm: number;
  geometry: LngLat[];
  steps: ManeuverStep[];
  hazardIds: string[];
}

export interface Place {
  id: string;
  name: string;
  address: string;
  coord: LngLat;
  recent?: boolean;
}

export const KIND_LABEL: Record<HazardKind, string> = {
  construction: 'Construction',
  unlit: 'No street lighting',
  pothole: 'Pothole / broken surface',
  highway: 'Fast traffic, no shoulder',
  debris: 'Debris on path',
  no_bike_lane: 'Bike lane ends',
};
```

- [ ] **Step 4: Write the locale constant**

Create `src/data/locale.ts`:

```ts
import { LngLat } from './types';

/** Change this one constant to relocate every fixture. */
export const ORIGIN: LngLat = { lng: 150.8931, lat: -34.4278 }; // Wollongong NSW
export const DEFAULT_ZOOM = 14;
```

- [ ] **Step 5: Write the hazard fixtures**

Create `src/data/hazards.ts`:

```ts
import { Hazard } from './types';

const v = (kind: Hazard['kind'], dangerLevel: Hazard['dangerLevel'], confidence: number, caption: string) =>
  ({ kind, dangerLevel, confidence, caption });

export const HAZARDS: Hazard[] = [
  {
    id: 'hz-1',
    coord: { lng: 150.8955, lat: -34.4241 },
    kind: 'construction',
    dangerLevel: 'dangerous',
    status: 'active',
    streetName: 'Crown St',
    reports: [
      {
        id: 'rp-1', hazardId: 'hz-1', photo: 'construction-a',
        reportedAt: '2026-08-14T08:12:00Z', reporterName: 'Mia', intent: 'report',
        ai: v('construction', 'dangerous', 0.94, 'Footpath closed, cyclists forced into the traffic lane.'),
      },
      {
        id: 'rp-2', hazardId: 'hz-1', photo: 'construction-b',
        reportedAt: '2026-08-19T17:40:00Z', reporterName: 'Dan', intent: 'report',
        ai: v('construction', 'dangerous', 0.89, 'Barriers still in place, no marked detour for bikes.'),
      },
    ],
  },
  {
    id: 'hz-2',
    coord: { lng: 150.8887, lat: -34.4302 },
    kind: 'unlit',
    dangerLevel: 'moderate',
    status: 'active',
    streetName: 'Cliff Rd',
    activeWindow: { startMin: 19 * 60, endMin: 6 * 60 }, // 19:00–06:00, wraps
    reports: [
      {
        id: 'rp-3', hazardId: 'hz-2', photo: 'unlit-a',
        reportedAt: '2026-08-11T11:05:00Z', reporterName: 'Priya', intent: 'report',
        ai: v('unlit', 'moderate', 0.71, 'No street lighting along this stretch after dark.'),
      },
    ],
  },
  {
    id: 'hz-3',
    coord: { lng: 150.9012, lat: -34.4265 },
    kind: 'pothole',
    dangerLevel: 'moderate',
    status: 'active',
    streetName: 'Keira St',
    reports: [
      {
        id: 'rp-4', hazardId: 'hz-3', photo: 'pothole-a',
        reportedAt: '2026-08-17T06:55:00Z', reporterName: 'Sam', intent: 'report',
        ai: v('pothole', 'moderate', 0.83, 'Deep pothole in the bike lane, roughly 30cm across.'),
      },
    ],
  },
  {
    id: 'hz-4',
    coord: { lng: 150.8848, lat: -34.4198 },
    kind: 'highway',
    dangerLevel: 'dangerous',
    status: 'active',
    streetName: 'Princes Hwy',
    reports: [
      {
        id: 'rp-5', hazardId: 'hz-4', photo: 'highway-a',
        reportedAt: '2026-08-09T14:20:00Z', reporterName: 'Josh', intent: 'report',
        ai: v('highway', 'dangerous', 0.96, 'High-speed traffic with no shoulder or separated path.'),
      },
    ],
  },
  {
    id: 'hz-5',
    coord: { lng: 150.8969, lat: -34.4331 },
    kind: 'debris',
    dangerLevel: 'low',
    status: 'active',
    streetName: 'Bank St',
    reports: [
      {
        id: 'rp-6', hazardId: 'hz-5', photo: 'debris-a',
        reportedAt: '2026-08-20T09:30:00Z', reporterName: 'Ella', intent: 'report',
        ai: v('debris', 'low', 0.62, 'Scattered branches at the path edge, passable with care.'),
      },
    ],
  },
  {
    id: 'hz-6',
    coord: { lng: 150.8921, lat: -34.4224 },
    kind: 'pothole',
    dangerLevel: 'moderate',
    status: 'fixed',
    streetName: 'Smith St',
    reports: [
      {
        id: 'rp-7', hazardId: 'hz-6', photo: 'pothole-b',
        reportedAt: '2026-07-28T07:10:00Z', reporterName: 'Ari', intent: 'report',
        ai: v('pothole', 'moderate', 0.78, 'Broken surface across the bike lane.'),
      },
      {
        id: 'rp-8', hazardId: 'hz-6', photo: 'pothole-fixed',
        reportedAt: '2026-08-18T15:45:00Z', reporterName: 'Nina', intent: 'fix',
        ai: v('pothole', 'low', 0.91, 'Surface resealed, lane clear. Hazard appears resolved.'),
      },
    ],
  },
];
```

- [ ] **Step 6: Write the route fixtures**

Create `src/data/routes.ts`. Geometries are hand-plotted around Wollongong CBD; each has 8–12 points so polylines read as real streets.

```ts
import { RouteOption } from './types';

export const ROUTES: RouteOption[] = [
  {
    id: 'rt-safe',
    label: 'via Cliff Rd',
    durationMin: 24,
    distanceKm: 5.8,
    hazardIds: ['hz-2', 'hz-5'],
    geometry: [
      { lng: 150.8931, lat: -34.4278 }, { lng: 150.8916, lat: -34.4290 },
      { lng: 150.8896, lat: -34.4299 }, { lng: 150.8887, lat: -34.4302 },
      { lng: 150.8879, lat: -34.4318 }, { lng: 150.8912, lat: -34.4330 },
      { lng: 150.8969, lat: -34.4331 }, { lng: 150.9008, lat: -34.4325 },
      { lng: 150.9034, lat: -34.4310 },
    ],
    steps: [
      { id: 's1', instruction: 'Head south on Corrimal St',    modifier: 'straight',    distanceM: 320, atIndex: 0 },
      { id: 's2', instruction: 'Turn right onto Cliff Rd',      modifier: 'right',       distanceM: 640, atIndex: 2 },
      { id: 's3', instruction: 'Continue along the foreshore',  modifier: 'slight-left', distanceM: 1100, atIndex: 4 },
      { id: 's4', instruction: 'Turn left onto Bank St',        modifier: 'left',        distanceM: 780, atIndex: 6 },
      { id: 's5', instruction: 'Arrive at destination',         modifier: 'arrive',      distanceM: 0,   atIndex: 8 },
    ],
  },
  {
    id: 'rt-balanced',
    label: 'via Keira St',
    durationMin: 19,
    distanceKm: 5.1,
    hazardIds: ['hz-3', 'hz-5'],
    geometry: [
      { lng: 150.8931, lat: -34.4278 }, { lng: 150.8958, lat: -34.4272 },
      { lng: 150.8985, lat: -34.4268 }, { lng: 150.9012, lat: -34.4265 },
      { lng: 150.9021, lat: -34.4288 }, { lng: 150.9004, lat: -34.4312 },
      { lng: 150.8969, lat: -34.4331 }, { lng: 150.9034, lat: -34.4310 },
    ],
    steps: [
      { id: 's1', instruction: 'Head east on Burelli St',   modifier: 'straight', distanceM: 450, atIndex: 0 },
      { id: 's2', instruction: 'Turn right onto Keira St',  modifier: 'right',    distanceM: 890, atIndex: 3 },
      { id: 's3', instruction: 'Turn left onto Bank St',    modifier: 'left',     distanceM: 1200, atIndex: 5 },
      { id: 's4', instruction: 'Arrive at destination',     modifier: 'arrive',   distanceM: 0,   atIndex: 7 },
    ],
  },
  {
    id: 'rt-fast',
    label: 'via Princes Hwy',
    durationMin: 15,
    distanceKm: 4.6,
    hazardIds: ['hz-1', 'hz-4', 'hz-3'],
    geometry: [
      { lng: 150.8931, lat: -34.4278 }, { lng: 150.8926, lat: -34.4256 },
      { lng: 150.8955, lat: -34.4241 }, { lng: 150.8901, lat: -34.4220 },
      { lng: 150.8848, lat: -34.4198 }, { lng: 150.8890, lat: -34.4250 },
      { lng: 150.9012, lat: -34.4265 }, { lng: 150.9034, lat: -34.4310 },
    ],
    steps: [
      { id: 's1', instruction: 'Head north on Corrimal St',    modifier: 'straight',     distanceM: 280, atIndex: 0 },
      { id: 's2', instruction: 'Turn left onto Crown St',      modifier: 'left',         distanceM: 520, atIndex: 2 },
      { id: 's3', instruction: 'Merge onto Princes Hwy',       modifier: 'slight-right', distanceM: 1600, atIndex: 4 },
      { id: 's4', instruction: 'Exit onto Keira St',           modifier: 'right',        distanceM: 900, atIndex: 6 },
      { id: 's5', instruction: 'Arrive at destination',        modifier: 'arrive',       distanceM: 0,   atIndex: 7 },
    ],
  },
];
```

- [ ] **Step 7: Write the place fixtures**

Create `src/data/places.ts`:

```ts
import { Place } from './types';

export const PLACES: Place[] = [
  { id: 'pl-1', name: 'University of Wollongong', address: 'Northfields Ave, Keiraville', coord: { lng: 150.8794, lat: -34.4050 }, recent: true },
  { id: 'pl-2', name: 'Wollongong Station',       address: 'Station St, Wollongong',      coord: { lng: 150.8894, lat: -34.4258 }, recent: true },
  { id: 'pl-3', name: 'North Beach',              address: 'Cliff Rd, North Wollongong',  coord: { lng: 150.9034, lat: -34.4310 } },
  { id: 'pl-4', name: 'Wollongong Botanic Garden',address: 'Murphys Ave, Keiraville',     coord: { lng: 150.8735, lat: -34.4147 } },
  { id: 'pl-5', name: 'Crown Street Mall',        address: 'Crown St, Wollongong',        coord: { lng: 150.8955, lat: -34.4241 } },
  { id: 'pl-6', name: 'Port Kembla Beach',        address: 'Military Rd, Port Kembla',    coord: { lng: 150.9139, lat: -34.4712 } },
];
```

- [ ] **Step 8: Run tests**

Run: `npm test -- fixtures`
Expected: PASS, 7 tests

- [ ] **Step 9: Commit**

```bash
git add src/data
git commit -m "feat: add domain types and Wollongong fixtures"
```

---

### Task 4: Geo logic and the GPS gate

**Files:**
- Create: `src/lib/geo.ts`
- Test: `src/lib/__tests__/geo.test.ts`

**Interfaces:**
- Consumes: `LngLat` from `src/data/types`
- Produces: `haversineMeters(a: LngLat, b: LngLat): number`, `GATE_RADIUS_M: 75`, `checkGate(user: LngLat, target: LngLat): { withinRange: boolean; distanceM: number }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/geo.test.ts`:

```ts
import { haversineMeters, checkGate, GATE_RADIUS_M } from '../geo';

const wollongong = { lng: 150.8931, lat: -34.4278 };

describe('haversineMeters', () => {
  it('returns zero for the same point', () => {
    expect(haversineMeters(wollongong, wollongong)).toBe(0);
  });

  it('measures a known short distance', () => {
    // ~111m north
    const north = { lng: 150.8931, lat: -34.4268 };
    expect(haversineMeters(wollongong, north)).toBeGreaterThan(105);
    expect(haversineMeters(wollongong, north)).toBeLessThan(118);
  });

  it('is symmetric', () => {
    const other = { lng: 150.9012, lat: -34.4265 };
    expect(haversineMeters(wollongong, other)).toBeCloseTo(haversineMeters(other, wollongong), 6);
  });
});

describe('checkGate', () => {
  it('allows a user standing at the hazard', () => {
    expect(checkGate(wollongong, wollongong)).toEqual({ withinRange: true, distanceM: 0 });
  });

  it('allows a user just inside the radius', () => {
    const near = { lng: 150.8931, lat: -34.42744 }; // ~40m
    const r = checkGate(near, wollongong);
    expect(r.withinRange).toBe(true);
    expect(r.distanceM).toBeLessThan(GATE_RADIUS_M);
  });

  it('blocks a user outside the radius', () => {
    const far = { lng: 150.9012, lat: -34.4265 }; // ~780m
    const r = checkGate(far, wollongong);
    expect(r.withinRange).toBe(false);
    expect(r.distanceM).toBeGreaterThan(GATE_RADIUS_M);
  });

  it('rounds the distance to a whole metre for display', () => {
    const near = { lng: 150.8935, lat: -34.4280 };
    expect(Number.isInteger(checkGate(near, wollongong).distanceM)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- geo`
Expected: FAIL, "Cannot find module '../geo'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/geo.ts`:

```ts
import { LngLat } from '../data/types';

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Hard block radius for the report GPS gate. */
export const GATE_RADIUS_M = 75;

export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function checkGate(user: LngLat, target: LngLat) {
  const distanceM = Math.round(haversineMeters(user, target));
  return { withinRange: distanceM <= GATE_RADIUS_M, distanceM };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- geo`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/__tests__/geo.test.ts
git commit -m "feat: add haversine distance and GPS report gate"
```

---

### Task 5: Time-of-day hazard activity

**Files:**
- Create: `src/lib/time.ts`
- Test: `src/lib/__tests__/time.test.ts`

**Interfaces:**
- Consumes: `Hazard`, `TimeWindow` from `src/data/types`
- Produces: `minutesOfDay(d: Date): number`, `isWithinWindow(w: TimeWindow, minutes: number): boolean`, `isHazardActiveAt(h: Hazard, at: Date): boolean`, `formatDepartureLabel(at: Date, isNow: boolean): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/time.test.ts`:

```ts
import { minutesOfDay, isWithinWindow, isHazardActiveAt, formatDepartureLabel } from '../time';
import { Hazard } from '../../data/types';

const at = (h: number, m = 0) => new Date(2026, 7, 22, h, m);

const unlit: Hazard = {
  id: 'u', coord: { lng: 0, lat: 0 }, kind: 'unlit', dangerLevel: 'moderate',
  status: 'active', streetName: 'X', reports: [],
  activeWindow: { startMin: 19 * 60, endMin: 6 * 60 },
};

const pothole: Hazard = {
  id: 'p', coord: { lng: 0, lat: 0 }, kind: 'pothole', dangerLevel: 'moderate',
  status: 'active', streetName: 'Y', reports: [],
};

const fixed: Hazard = { ...pothole, id: 'f', status: 'fixed' };

describe('minutesOfDay', () => {
  it('converts a time to minutes past midnight', () => {
    expect(minutesOfDay(at(0, 0))).toBe(0);
    expect(minutesOfDay(at(19, 30))).toBe(19 * 60 + 30);
  });
});

describe('isWithinWindow', () => {
  const evening = { startMin: 19 * 60, endMin: 6 * 60 }; // wraps midnight
  const daytime = { startMin: 9 * 60, endMin: 17 * 60 }; // does not wrap

  it('handles a window that wraps past midnight', () => {
    expect(isWithinWindow(evening, 20 * 60)).toBe(true);
    expect(isWithinWindow(evening, 2 * 60)).toBe(true);
    expect(isWithinWindow(evening, 12 * 60)).toBe(false);
  });

  it('handles a same-day window', () => {
    expect(isWithinWindow(daytime, 12 * 60)).toBe(true);
    expect(isWithinWindow(daytime, 20 * 60)).toBe(false);
  });

  it('includes the start boundary and excludes the end boundary', () => {
    expect(isWithinWindow(daytime, 9 * 60)).toBe(true);
    expect(isWithinWindow(daytime, 17 * 60)).toBe(false);
  });
});

describe('isHazardActiveAt', () => {
  it('activates an unlit road only after dark', () => {
    expect(isHazardActiveAt(unlit, at(21))).toBe(true);
    expect(isHazardActiveAt(unlit, at(13))).toBe(false);
  });

  it('always activates a hazard with no window', () => {
    expect(isHazardActiveAt(pothole, at(3))).toBe(true);
    expect(isHazardActiveAt(pothole, at(13))).toBe(true);
  });

  it('never activates a fixed hazard', () => {
    expect(isHazardActiveAt(fixed, at(13))).toBe(false);
  });
});

describe('formatDepartureLabel', () => {
  it('says Leaving now when departing now', () => {
    expect(formatDepartureLabel(at(13, 5), true)).toBe('Leaving now');
  });

  it('shows a padded 24h time otherwise', () => {
    expect(formatDepartureLabel(at(9, 5), false)).toBe('Leaving 09:05');
    expect(formatDepartureLabel(at(21, 30), false)).toBe('Leaving 21:30');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- time`
Expected: FAIL, "Cannot find module '../time'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/time.ts`:

```ts
import { Hazard, TimeWindow } from '../data/types';

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Start-inclusive, end-exclusive. Wraps when startMin > endMin. */
export function isWithinWindow(w: TimeWindow, minutes: number): boolean {
  if (w.startMin <= w.endMin) return minutes >= w.startMin && minutes < w.endMin;
  return minutes >= w.startMin || minutes < w.endMin;
}

export function isHazardActiveAt(h: Hazard, at: Date): boolean {
  if (h.status === 'fixed') return false;
  if (!h.activeWindow) return true;
  return isWithinWindow(h.activeWindow, minutesOfDay(at));
}

export function formatDepartureLabel(at: Date, isNow: boolean): string {
  if (isNow) return 'Leaving now';
  const hh = String(at.getHours()).padStart(2, '0');
  const mm = String(at.getMinutes()).padStart(2, '0');
  return `Leaving ${hh}:${mm}`;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- time`
Expected: PASS, 10 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/time.ts src/lib/__tests__/time.test.ts
git commit -m "feat: add time-of-day hazard activity windows"
```

---

### Task 6: Route hazard scoring

**Files:**
- Create: `src/lib/scoring.ts`
- Test: `src/lib/__tests__/scoring.test.ts`

**Interfaces:**
- Consumes: `isHazardActiveAt` from `src/lib/time`; `Hazard`, `RouteOption`, `DangerLevel` from `src/data/types`
- Produces: `HazardCount = { dangerous: number; moderate: number; low: number; total: number }`, `activeHazardsForRoute(route, hazards, at): Hazard[]`, `countByLevel(hazards): HazardCount`, `safestRouteId(routes, hazards, at): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/scoring.test.ts`:

```ts
import { activeHazardsForRoute, countByLevel, safestRouteId } from '../scoring';
import { HAZARDS } from '../../data/hazards';
import { ROUTES } from '../../data/routes';

const noon = new Date(2026, 7, 22, 12, 0);
const night = new Date(2026, 7, 22, 21, 0);

describe('activeHazardsForRoute', () => {
  it('drops the unlit hazard at noon and keeps it at night', () => {
    const safe = ROUTES.find((r) => r.id === 'rt-safe')!;
    const day = activeHazardsForRoute(safe, HAZARDS, noon).map((h) => h.id);
    const dark = activeHazardsForRoute(safe, HAZARDS, night).map((h) => h.id);
    expect(day).not.toContain('hz-2');
    expect(dark).toContain('hz-2');
  });

  it('ignores hazard ids that are fixed', () => {
    const withFixed = { ...ROUTES[0], hazardIds: ['hz-6'] };
    expect(activeHazardsForRoute(withFixed, HAZARDS, noon)).toHaveLength(0);
  });

  it('ignores unknown hazard ids without throwing', () => {
    const bogus = { ...ROUTES[0], hazardIds: ['nope'] };
    expect(activeHazardsForRoute(bogus, HAZARDS, noon)).toHaveLength(0);
  });
});

describe('countByLevel', () => {
  it('buckets hazards by tier and totals them', () => {
    const fast = ROUTES.find((r) => r.id === 'rt-fast')!;
    const c = countByLevel(activeHazardsForRoute(fast, HAZARDS, noon));
    expect(c.dangerous).toBe(2);
    expect(c.moderate).toBe(1);
    expect(c.low).toBe(0);
    expect(c.total).toBe(3);
  });

  it('returns all zeroes for an empty list', () => {
    expect(countByLevel([])).toEqual({ dangerous: 0, moderate: 0, low: 0, total: 0 });
  });
});

describe('safestRouteId', () => {
  it('prefers the route with fewest weighted hazards, not the fastest', () => {
    expect(safestRouteId(ROUTES, HAZARDS, noon)).toBe('rt-safe');
  });

  it('breaks ties on duration', () => {
    const a = { ...ROUTES[0], id: 'a', hazardIds: [], durationMin: 30 };
    const b = { ...ROUTES[1], id: 'b', hazardIds: [], durationMin: 20 };
    expect(safestRouteId([a, b], HAZARDS, noon)).toBe('b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scoring`
Expected: FAIL, "Cannot find module '../scoring'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/scoring.ts`:

```ts
import { DangerLevel, Hazard, RouteOption } from '../data/types';
import { isHazardActiveAt } from './time';

export interface HazardCount {
  dangerous: number;
  moderate: number;
  low: number;
  total: number;
}

/** Mirrors the production GraphHopper custom_model penalties. */
const WEIGHT: Record<DangerLevel, number> = { dangerous: 10, moderate: 4, low: 1 };

export function activeHazardsForRoute(route: RouteOption, hazards: Hazard[], at: Date): Hazard[] {
  const byId = new Map(hazards.map((h) => [h.id, h]));
  return route.hazardIds
    .map((id) => byId.get(id))
    .filter((h): h is Hazard => Boolean(h) && isHazardActiveAt(h as Hazard, at));
}

export function countByLevel(hazards: Hazard[]): HazardCount {
  const c: HazardCount = { dangerous: 0, moderate: 0, low: 0, total: 0 };
  for (const h of hazards) {
    c[h.dangerLevel] += 1;
    c.total += 1;
  }
  return c;
}

export function safestRouteId(routes: RouteOption[], hazards: Hazard[], at: Date): string {
  let best = routes[0];
  let bestScore = Infinity;

  for (const r of routes) {
    const score = activeHazardsForRoute(r, hazards, at)
      .reduce((sum, h) => sum + WEIGHT[h.dangerLevel], 0);

    if (score < bestScore || (score === bestScore && r.durationMin < best.durationMin)) {
      best = r;
      bestScore = score;
    }
  }
  return best.id;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- scoring`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/__tests__/scoring.test.ts
git commit -m "feat: add time-aware route hazard scoring"
```

---

### Task 7: Scripted AI verdict

**Files:**
- Create: `src/lib/fakeAI.ts`
- Test: `src/lib/__tests__/fakeAI.test.ts`

**Interfaces:**
- Consumes: `AIVerdict`, `HazardKind` from `src/data/types`
- Produces: `analyzeReportPhoto(seed?: number): Promise<AIVerdict>`, `analyzeFixPhoto(kind: HazardKind): Promise<AIVerdict>`, `ANALYSIS_DELAY_MS: 1600`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/fakeAI.test.ts`:

```ts
import { analyzeReportPhoto, analyzeFixPhoto } from '../fakeAI';

jest.useFakeTimers();

const resolve = async <T,>(p: Promise<T>): Promise<T> => {
  jest.runAllTimers();
  return p;
};

describe('analyzeReportPhoto', () => {
  it('returns a verdict with a confidence between 0 and 1', async () => {
    const v = await resolve(analyzeReportPhoto(0));
    expect(v.confidence).toBeGreaterThan(0);
    expect(v.confidence).toBeLessThanOrEqual(1);
  });

  it('returns one of the three danger tiers', async () => {
    const v = await resolve(analyzeReportPhoto(1));
    expect(['dangerous', 'moderate', 'low']).toContain(v.dangerLevel);
  });

  it('is deterministic for a given seed', async () => {
    const a = await resolve(analyzeReportPhoto(2));
    const b = await resolve(analyzeReportPhoto(2));
    expect(a).toEqual(b);
  });

  it('gives a non-empty caption', async () => {
    const v = await resolve(analyzeReportPhoto(0));
    expect(v.caption.length).toBeGreaterThan(10);
  });
});

describe('analyzeFixPhoto', () => {
  it('downgrades the hazard to low and keeps the kind', async () => {
    const v = await resolve(analyzeFixPhoto('pothole'));
    expect(v.kind).toBe('pothole');
    expect(v.dangerLevel).toBe('low');
    expect(v.confidence).toBeGreaterThan(0.8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- fakeAI`
Expected: FAIL, "Cannot find module '../fakeAI'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/fakeAI.ts`:

```ts
import { AIVerdict, HazardKind, KIND_LABEL } from '../data/types';

export const ANALYSIS_DELAY_MS = 1600;

const SCRIPT: AIVerdict[] = [
  { kind: 'construction', dangerLevel: 'dangerous', confidence: 0.92,
    caption: 'Roadworks blocking the bike lane. Cyclists are pushed into live traffic.' },
  { kind: 'pothole', dangerLevel: 'moderate', confidence: 0.79,
    caption: 'Broken road surface in the riding line. Avoidable but risky at speed.' },
  { kind: 'unlit', dangerLevel: 'moderate', confidence: 0.68,
    caption: 'No functioning street lighting visible along this section.' },
  { kind: 'debris', dangerLevel: 'low', confidence: 0.58,
    caption: 'Loose debris near the path edge. Passable with care.' },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((res) => setTimeout(() => res(value), ANALYSIS_DELAY_MS));

export function analyzeReportPhoto(seed = 0): Promise<AIVerdict> {
  return delay(SCRIPT[Math.abs(Math.trunc(seed)) % SCRIPT.length]);
}

export function analyzeFixPhoto(kind: HazardKind): Promise<AIVerdict> {
  return delay({
    kind,
    dangerLevel: 'low',
    confidence: 0.91,
    caption: `${KIND_LABEL[kind]} no longer visible at this location. Hazard appears resolved.`,
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- fakeAI`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/fakeAI.ts src/lib/__tests__/fakeAI.test.ts
git commit -m "feat: add scripted AI photo analysis"
```

---

### Task 8: UI primitives

**Files:**
- Create: `src/components/Button.tsx`, `Chip.tsx`, `Card.tsx`, `Sheet.tsx`, `DangerBadge.tsx`, `ConfidenceBar.tsx`
- Test: `src/components/__tests__/primitives.test.tsx`

**Interfaces:**
- Consumes: `colors`, `spacing`, `radii`, `shadows`, `danger` from `src/theme/tokens`; `type` from `src/theme/type`
- Produces:
  - `Button({ label, onPress, variant?: 'primary'|'secondary'|'subtle'|'floating'|'large', disabled?, testID? })`
  - `Chip({ label, selected?, onPress, testID? })`
  - `Card({ children, tinted?, elevated?, style? })`
  - `Sheet({ children, style? })`
  - `DangerBadge({ level, compact?, testID? })`
  - `ConfidenceBar({ value, testID? })`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/primitives.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '../Button';
import { DangerBadge } from '../DangerBadge';
import { ConfidenceBar } from '../ConfidenceBar';
import { danger } from '../../theme/tokens';

describe('Button', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    render(<Button label="See routes" onPress={onPress} />);
    fireEvent.press(screen.getByText('See routes'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Submit" onPress={onPress} disabled testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps the primary CTA black, never a danger colour', () => {
    render(<Button label="Go" onPress={() => {}} testID="btn" />);
    const style = screen.getByTestId('btn').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flat.backgroundColor).toBe('#000000');
    expect(flat.borderRadius).toBe(999);
  });
});

describe('DangerBadge', () => {
  it.each(['dangerous', 'moderate', 'low'] as const)('renders the %s tier label', (level) => {
    render(<DangerBadge level={level} />);
    expect(screen.getByText(danger[level].label)).toBeTruthy();
  });
});

describe('ConfidenceBar', () => {
  it('shows the confidence as a whole percentage', () => {
    render(<ConfidenceBar value={0.94} />);
    expect(screen.getByText('94%')).toBeTruthy();
  });

  it('clamps out-of-range values', () => {
    render(<ConfidenceBar value={1.4} testID="cb" />);
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- primitives`
Expected: FAIL, "Cannot find module '../Button'"

- [ ] **Step 3: Write Button**

Create `src/components/Button.tsx`:

```tsx
import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type } from '../theme/type';

type Variant = 'primary' | 'secondary' | 'subtle' | 'floating' | 'large';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}

const BG: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.canvas,
  subtle: colors.canvasSoft,
  floating: colors.canvas,
  large: colors.primary,
};

const FG: Record<Variant, string> = {
  primary: colors.onPrimary,
  secondary: colors.ink,
  subtle: colors.ink,
  floating: colors.ink,
  large: colors.onPrimary,
};

export function Button({ label, onPress, variant = 'primary', disabled, testID, style }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: BG[variant],
          // button-large-rounded is DESIGN.md's one documented pill exception
          borderRadius: variant === 'large' ? radii.xl : radii.pill,
          paddingVertical: variant === 'large' ? spacing.lg : spacing.md,
          paddingHorizontal: variant === 'large' ? spacing.xl : spacing.xl,
          opacity: disabled ? 0.35 : 1,
        },
        variant === 'floating' && shadows.level3,
        variant === 'secondary' && styles.hairline,
        style,
      ]}
    >
      <Text style={[variant === 'large' ? type.buttonLarge : type.buttonMd, { color: FG[variant] }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  hairline: { borderWidth: 1, borderColor: colors.surfacePressed },
});
```

- [ ] **Step 4: Write Chip, Card, Sheet**

Create `src/components/Chip.tsx`:

```tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type } from '../theme/type';

interface Props { label: string; selected?: boolean; onPress?: () => void; testID?: string }

export function Chip({ label, selected, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.primary }]}
    >
      <Text style={[type.bodySmStrong, { color: selected ? colors.onPrimary : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
});
```

Create `src/components/Card.tsx`:

```tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';

interface Props { children: ReactNode; tinted?: boolean; elevated?: boolean; style?: ViewStyle }

export function Card({ children, tinted, elevated, style }: Props) {
  return (
    <View
      style={[
        styles.card,
        tinted && { backgroundColor: colors.canvasSoft },
        elevated && shadows.level1,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.canvas, borderRadius: radii.xl, padding: spacing.xxl },
});
```

Create `src/components/Sheet.tsx`:

```tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';

interface Props { children: ReactNode; style?: ViewStyle }

export function Sheet({ children, style }: Props) {
  return (
    <View style={[styles.sheet, shadows.level2, style]}>
      <View style={styles.grabber} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  grabber: {
    width: 36, height: 4, borderRadius: radii.pill,
    backgroundColor: colors.surfacePressed, alignSelf: 'center', marginBottom: spacing.lg,
  },
});
```

- [ ] **Step 5: Write DangerBadge and ConfidenceBar**

Create `src/components/DangerBadge.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, danger } from '../theme/tokens';
import { type } from '../theme/type';
import { DangerLevel } from '../data/types';

interface Props { level: DangerLevel; compact?: boolean; testID?: string }

export function DangerBadge({ level, compact, testID }: Props) {
  const d = danger[level];
  return (
    <View testID={testID} style={[styles.badge, { borderColor: d.color }, compact && styles.compact]}>
      <View
        style={[
          styles.dot,
          { borderColor: d.color, backgroundColor: d.fill === 'outline' ? 'transparent' : d.color },
          d.fill === 'half' && { backgroundColor: d.color, opacity: 0.5 },
        ]}
      />
      <Text style={[type.bodySmStrong, { color: colors.ink }]}>{d.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderRadius: radii.pill,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md, alignSelf: 'flex-start',
  },
  compact: { paddingVertical: 2, paddingHorizontal: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radii.full, borderWidth: 1.5 },
});
```

Create `src/components/ConfidenceBar.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type } from '../theme/type';

interface Props { value: number; testID?: string }

export function ConfidenceBar({ value, testID }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View testID={testID} style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[type.bodySm, { color: colors.body }]}>AI confidence</Text>
        <Text style={[type.bodySmStrong, { color: colors.ink }]}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.canvasSoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.ink },
});
```

- [ ] **Step 6: Run tests**

Run: `npm test -- primitives`
Expected: PASS, 8 tests

- [ ] **Step 7: Commit**

```bash
git add src/components src/components/__tests__
git commit -m "feat: add UI primitives on DESIGN.md tokens"
```

---

### Task 9: Map abstraction

**Files:**
- Create: `src/map/types.ts`, `src/map/MapView.web.tsx`, `src/map/MapView.native.tsx`
- Test: `src/map/__tests__/types.test.ts`

**Interfaces:**
- Consumes: `LngLat`, `Hazard`, `RouteOption` from `src/data/types`; `danger` from `src/theme/tokens`
- Produces: `MapViewProps`, `hazardFeatureCollection(hazards)`, `routeFeature(route, active)`, default-exported `MapView`

`MapViewProps`:

```ts
export interface MapViewProps {
  center: LngLat;
  zoom?: number;
  hazards?: Hazard[];
  routes?: RouteOption[];
  activeRouteId?: string;
  userLocation?: LngLat;
  onHazardPress?: (id: string) => void;
  followBearing?: number;
  style?: object;
}
```

- [ ] **Step 1: Write the failing test**

Create `src/map/__tests__/types.test.ts`:

```ts
import { hazardFeatureCollection, routeFeature } from '../geojson';
import { HAZARDS } from '../../data/hazards';
import { ROUTES } from '../../data/routes';

describe('hazardFeatureCollection', () => {
  it('emits one point feature per hazard carrying id and tier', () => {
    const fc = hazardFeatureCollection(HAZARDS.slice(0, 2));
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.type).toBe('Point');
    expect(fc.features[0].properties.id).toBe('hz-1');
    expect(fc.features[0].properties.level).toBe('dangerous');
    expect(fc.features[0].properties.color).toBe('#d6202a');
  });

  it('orders coordinates lng,lat for GeoJSON', () => {
    const fc = hazardFeatureCollection([HAZARDS[0]]);
    expect(fc.features[0].geometry.coordinates).toEqual([150.8955, -34.4241]);
  });
});

describe('routeFeature', () => {
  it('emits a LineString with every geometry point', () => {
    const f = routeFeature(ROUTES[0], true);
    expect(f.geometry.type).toBe('LineString');
    expect(f.geometry.coordinates).toHaveLength(ROUTES[0].geometry.length);
    expect(f.properties.active).toBe(true);
  });

  it('marks inactive routes so they render muted', () => {
    expect(routeFeature(ROUTES[1], false).properties.active).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- map`
Expected: FAIL, "Cannot find module '../geojson'"

- [ ] **Step 3: Write the shared types and GeoJSON helpers**

Create `src/map/types.ts`:

```ts
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
  style?: object;
}

/** Keyless greyscale basemap — lands close to DESIGN.md's mono system. */
export const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
```

Create `src/map/geojson.ts`:

```ts
import { Hazard, RouteOption } from '../data/types';
import { danger } from '../theme/tokens';

export function hazardFeatureCollection(hazards: Hazard[]) {
  return {
    type: 'FeatureCollection' as const,
    features: hazards.map((h) => ({
      type: 'Feature' as const,
      properties: {
        id: h.id,
        level: h.dangerLevel,
        color: danger[h.dangerLevel].color,
        kind: h.kind,
      },
      geometry: { type: 'Point' as const, coordinates: [h.coord.lng, h.coord.lat] },
    })),
  };
}

export function routeFeature(route: RouteOption, active: boolean) {
  return {
    type: 'Feature' as const,
    properties: { id: route.id, active },
    geometry: {
      type: 'LineString' as const,
      coordinates: route.geometry.map((p) => [p.lng, p.lat]),
    },
  };
}
```

- [ ] **Step 4: Write the web map**

Create `src/map/MapView.web.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapViewProps, STYLE_URL } from './types';
import { hazardFeatureCollection, routeFeature } from './geojson';
import { colors } from '../theme/tokens';

export default function MapView(props: MapViewProps) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const cb = useRef(props.onHazardPress);
  cb.current = props.onHazardPress;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: STYLE_URL,
      center: [props.center.lng, props.center.lat],
      zoom: props.zoom ?? 14,
      attributionControl: false,
    });
    map.current = m;

    m.on('load', () => {
      m.addSource('routes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({
        id: 'routes-line', type: 'line', source: 'routes',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['case', ['get', 'active'], colors.ink, colors.mute],
          'line-width': ['case', ['get', 'active'], 6, 4],
          'line-opacity': ['case', ['get', 'active'], 1, 0.55],
        },
      });

      m.addSource('hazards', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({
        id: 'hazards-halo', type: 'circle', source: 'hazards',
        paint: { 'circle-radius': 14, 'circle-color': ['get', 'color'], 'circle-opacity': 0.18 },
      });
      m.addLayer({
        id: 'hazards-dot', type: 'circle', source: 'hazards',
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': colors.canvas,
        },
      });

      m.on('click', 'hazards-dot', (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) cb.current?.(String(id));
      });
      m.on('mouseenter', 'hazards-dot', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'hazards-dot', () => { m.getCanvas().style.cursor = ''; });
    });

    return () => { m.remove(); map.current = null; };
  }, []);

  // Push data updates
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      const hs = m.getSource('hazards') as maplibregl.GeoJSONSource | undefined;
      hs?.setData(hazardFeatureCollection(props.hazards ?? []) as never);

      const rs = m.getSource('routes') as maplibregl.GeoJSONSource | undefined;
      rs?.setData({
        type: 'FeatureCollection',
        features: (props.routes ?? []).map((r) => routeFeature(r, r.id === props.activeRouteId)),
      } as never);
    };
    m.isStyleLoaded() ? apply() : m.once('load', apply);
  }, [props.hazards, props.routes, props.activeRouteId]);

  // Follow the camera
  useEffect(() => {
    map.current?.easeTo({
      center: [props.center.lng, props.center.lat],
      zoom: props.zoom ?? 14,
      bearing: props.followBearing ?? 0,
      duration: 600,
    });
  }, [props.center.lng, props.center.lat, props.zoom, props.followBearing]);

  return <div ref={el} style={{ position: 'absolute', inset: 0, ...(props.style as object) }} />;
}
```

- [ ] **Step 5: Write the native stub**

Create `src/map/MapView.native.tsx`. Native rendering is deliberately out of scope for the draft — this keeps the interface honest without pulling in `@rnmapbox/maps`.

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapViewProps } from './types';
import { colors, spacing } from '../theme/tokens';
import { type } from '../theme/type';

export default function MapView(_props: MapViewProps) {
  return (
    <View style={styles.wrap}>
      <Text style={[type.bodyMdStrong, { color: colors.ink }]}>Map preview</Text>
      <Text style={[type.bodySm, { color: colors.body, textAlign: 'center' }]}>
        Native map rendering is not part of the UI draft.{'\n'}Run the app on web to see the map.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.canvasSoft,
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl,
  },
});
```

- [ ] **Step 6: Run tests**

Run: `npm test -- map`
Expected: PASS, 4 tests

- [ ] **Step 7: Commit**

```bash
git add src/map
git commit -m "feat: add platform-split map with maplibre web renderer"
```

---

### Task 10: Tab shell and home map

**Files:**
- Create: `app/(tabs)/_layout.tsx` (replace template), `app/(tabs)/index.tsx`, `src/components/TimeChip.tsx`
- Modify: `app/_layout.tsx`
- Test: `app/__tests__/home.test.tsx`

**Interfaces:**
- Consumes: `MapView` from `src/map/MapView`; `HAZARDS`, `ORIGIN`, `DEFAULT_ZOOM`; `formatDepartureLabel` from `src/lib/time`; `Button`, `Chip` from components
- Produces: route `/`, `TimeChip({ at, isNow, onPress })`

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/home.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Home from '../(tabs)/index';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  Link: ({ children }: any) => children,
}));

describe('Home map screen', () => {
  it('offers the destination search entry point', () => {
    render(<Home />);
    expect(screen.getByText('Where to?')).toBeTruthy();
  });

  it('shows the departure time chip', () => {
    render(<Home />);
    expect(screen.getByTestId('time-chip')).toBeTruthy();
  });

  it('summarises nearby hazards', () => {
    render(<Home />);
    expect(screen.getByTestId('hazard-summary')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- home`
Expected: FAIL, "Cannot find module '../(tabs)/index'"

- [ ] **Step 3: Write TimeChip**

Create `src/components/TimeChip.tsx`:

```tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type } from '../theme/type';
import { formatDepartureLabel } from '../lib/time';

interface Props { at: Date; isNow: boolean; onPress: () => void; testID?: string }

export function TimeChip({ at, isNow, onPress, testID }: Props) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={[styles.chip, shadows.level3]}>
      <Text style={[type.bodySmStrong, { color: colors.ink }]}>
        {formatDepartureLabel(at, isNow)}  ▾
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.canvas, borderRadius: radii.pill,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start',
  },
});
```

- [ ] **Step 4: Write the root and tab layouts**

Replace `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="search" options={{ presentation: 'modal' }} />
      <Stack.Screen name="hazard/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
```

Replace `app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/theme/tokens';
import { type } from '../../src/theme/type';

const icon = (glyph: string) => ({ color }: { color: string }) => (
  <Text style={{ color, fontSize: 20 }}>{glyph}</Text>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mute,
        tabBarLabelStyle: type.caption,
        tabBarStyle: { backgroundColor: colors.canvas, borderTopColor: colors.canvasSoft },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Map',     tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: icon('☰') }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: Write the home screen**

Replace `app/(tabs)/index.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import MapView from '../../src/map/MapView';
import { TimeChip } from '../../src/components/TimeChip';
import { Sheet } from '../../src/components/Sheet';
import { Button } from '../../src/components/Button';
import { HAZARDS } from '../../src/data/hazards';
import { ORIGIN, DEFAULT_ZOOM } from '../../src/data/locale';
import { isHazardActiveAt } from '../../src/lib/time';
import { countByLevel } from '../../src/lib/scoring';
import { colors, radii, spacing, shadows } from '../../src/theme/tokens';
import { type } from '../../src/theme/type';

export default function Home() {
  const router = useRouter();
  const [departAt, setDepartAt] = useState(new Date());
  const [isNow, setIsNow] = useState(true);

  const active = useMemo(() => HAZARDS.filter((h) => isHazardActiveAt(h, departAt)), [departAt]);
  const counts = useMemo(() => countByLevel(active), [active]);

  // Toggle between now and 21:00 so the unlit hazard can be demoed.
  const cycleTime = () => {
    if (isNow) {
      const night = new Date(departAt);
      night.setHours(21, 0, 0, 0);
      setDepartAt(night);
      setIsNow(false);
    } else {
      setDepartAt(new Date());
      setIsNow(true);
    }
  };

  return (
    <View style={styles.root}>
      <MapView center={ORIGIN} zoom={DEFAULT_ZOOM} hazards={active} userLocation={ORIGIN}
        onHazardPress={(id) => router.push(`/hazard/${id}`)} />

      <View style={styles.top}>
        <Pressable style={[styles.search, shadows.level2]} onPress={() => router.push('/search')}>
          <Text style={[type.bodyMd, { color: colors.body }]}>Where to?</Text>
        </Pressable>
        <TimeChip testID="time-chip" at={departAt} isNow={isNow} onPress={cycleTime} />
      </View>

      <Sheet style={styles.sheet}>
        <Text style={[type.displaySm, { color: colors.ink }]}>Hazards near you</Text>
        <Text testID="hazard-summary" style={[type.bodySm, { color: colors.body, marginTop: spacing.xxs }]}>
          {counts.total} active · {counts.dangerous} dangerous · {counts.moderate} moderate · {counts.low} low
        </Text>
        <Button label="Report a hazard" variant="primary" style={{ marginTop: spacing.lg }}
          onPress={() => router.push('/report/capture')} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  top: { position: 'absolute', top: spacing.xxxl + spacing.lg, left: spacing.lg, right: spacing.lg, gap: spacing.md },
  search: {
    backgroundColor: colors.canvas, borderRadius: radii.pill,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, minHeight: 52, justifyContent: 'center',
  },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
```

- [ ] **Step 6: Run tests**

Run: `npm test -- home`
Expected: PASS, 3 tests

- [ ] **Step 7: Verify on web**

Run: `npx expo start --web`
Expected: greyscale map centred on Wollongong, coloured hazard dots, search pill, time chip, bottom sheet. Tapping the time chip changes the hazard count (the unlit hazard appears at 21:00).

- [ ] **Step 8: Commit**

```bash
git add app src/components/TimeChip.tsx
git commit -m "feat: add tab shell and home map screen"
```

---

### Task 11: Destination search

**Files:**
- Create: `app/search.tsx`
- Test: `app/__tests__/search.test.tsx`

**Interfaces:**
- Consumes: `PLACES` from `src/data/places`
- Produces: route `/search`, navigating to `/routes?placeId=<id>` on selection

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/search.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Search from '../search';

const push = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push, back: jest.fn() }) }));

beforeEach(() => push.mockClear());

describe('Destination search', () => {
  it('lists recent places before any query', () => {
    render(<Search />);
    expect(screen.getByText('Wollongong Station')).toBeTruthy();
  });

  it('filters places by name as the user types', () => {
    render(<Search />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'beach');
    expect(screen.getByText('North Beach')).toBeTruthy();
    expect(screen.queryByText('Wollongong Station')).toBeNull();
  });

  it('filters case-insensitively across name and address', () => {
    render(<Search />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'KEIRAVILLE');
    expect(screen.getByText('University of Wollongong')).toBeTruthy();
  });

  it('navigates to the route picker when a place is chosen', () => {
    render(<Search />);
    fireEvent.press(screen.getByText('North Beach'));
    expect(push).toHaveBeenCalledWith('/routes?placeId=pl-3');
  });

  it('shows an empty state when nothing matches', () => {
    render(<Search />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'zzzz');
    expect(screen.getByText('No places match that search.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- search`
Expected: FAIL, "Cannot find module '../search'"

- [ ] **Step 3: Write the screen**

Create `app/search.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PLACES } from '../src/data/places';
import { colors, radii, spacing } from '../src/theme/tokens';
import { type } from '../src/theme/type';

export default function Search() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return PLACES.filter((p) => p.recent);
    return PLACES.filter(
      (p) => p.name.toLowerCase().includes(term) || p.address.toLowerCase().includes(term),
    );
  }, [q]);

  return (
    <View style={styles.root}>
      <Text style={[type.displayMd, { color: colors.ink }]}>Where to?</Text>

      <TextInput
        testID="search-input"
        value={q}
        onChangeText={setQ}
        placeholder="Search a destination"
        placeholderTextColor={colors.mute}
        style={[type.bodyMd, styles.input]}
      />

      {!q.trim() && (
        <Text style={[type.bodySmStrong, styles.eyebrow]}>Recent</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={
          <Text style={[type.bodyMd, { color: colors.body, paddingVertical: spacing.xl }]}>
            No places match that search.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/routes?placeId=${item.id}`)}>
            <View style={styles.pin} />
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyMdStrong, { color: colors.ink }]}>{item.name}</Text>
              <Text style={[type.bodySm, { color: colors.body }]}>{item.address}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg, paddingTop: spacing.xxxl, gap: spacing.lg },
  input: {
    backgroundColor: colors.canvasSoft, borderRadius: radii.md,
    padding: spacing.lg, color: colors.ink, minHeight: 52,
  },
  eyebrow: { color: colors.body },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.canvasSoft,
  },
  pin: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.canvasSoft },
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- search`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add app/search.tsx app/__tests__/search.test.tsx
git commit -m "feat: add destination search screen"
```

---

### Task 12: Route selection

**Files:**
- Create: `app/routes.tsx`, `src/components/RouteCard.tsx`
- Test: `app/__tests__/routes.test.tsx`, `src/components/__tests__/routeCard.test.tsx`

**Interfaces:**
- Consumes: `ROUTES`, `HAZARDS`, `PLACES`; `activeHazardsForRoute`, `countByLevel`, `safestRouteId` from `src/lib/scoring`; `MapView`
- Produces: route `/routes`, `RouteCard({ route, counts, selected, isSafest, onPress })`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/routeCard.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RouteCard } from '../RouteCard';
import { ROUTES } from '../../data/routes';

const counts = { dangerous: 1, moderate: 2, low: 0, total: 3 };

describe('RouteCard', () => {
  it('leads with the ETA, Google-style', () => {
    render(<RouteCard route={ROUTES[0]} counts={counts} selected={false} isSafest={false} onPress={() => {}} />);
    expect(screen.getByText('24 min')).toBeTruthy();
  });

  it('shows distance and street label', () => {
    render(<RouteCard route={ROUTES[0]} counts={counts} selected={false} isSafest={false} onPress={() => {}} />);
    expect(screen.getByText('5.8 km · via Cliff Rd')).toBeTruthy();
  });

  it('summarises hazards by tier', () => {
    render(<RouteCard route={ROUTES[0]} counts={counts} selected={false} isSafest={false} onPress={() => {}} />);
    expect(screen.getByText('3 hazards')).toBeTruthy();
  });

  it('says when a route is clear', () => {
    const clear = { dangerous: 0, moderate: 0, low: 0, total: 0 };
    render(<RouteCard route={ROUTES[0]} counts={clear} selected={false} isSafest={false} onPress={() => {}} />);
    expect(screen.getByText('No known hazards')).toBeTruthy();
  });

  it('marks the safest route', () => {
    render(<RouteCard route={ROUTES[0]} counts={counts} selected={false} isSafest onPress={() => {}} />);
    expect(screen.getByText('Safest')).toBeTruthy();
  });

  it('fires onPress', () => {
    const onPress = jest.fn();
    render(<RouteCard route={ROUTES[0]} counts={counts} selected={false} isSafest={false} onPress={onPress} testID="rc" />);
    fireEvent.press(screen.getByTestId('rc'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

Create `app/__tests__/routes.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Routes from '../routes';

const push = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push, back: jest.fn() }),
  useLocalSearchParams: () => ({ placeId: 'pl-3' }),
}));

beforeEach(() => push.mockClear());

describe('Route selection', () => {
  it('renders one card per route option', () => {
    render(<Routes />);
    expect(screen.getByText('24 min')).toBeTruthy();
    expect(screen.getByText('19 min')).toBeTruthy();
    expect(screen.getByText('15 min')).toBeTruthy();
  });

  it('names the chosen destination', () => {
    render(<Routes />);
    expect(screen.getByText('North Beach')).toBeTruthy();
  });

  it('starts navigation with the selected route', () => {
    render(<Routes />);
    fireEvent.press(screen.getByTestId('start-btn'));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('/navigate?routeId='));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- route`
Expected: FAIL, "Cannot find module '../RouteCard'"

- [ ] **Step 3: Write RouteCard**

Create `src/components/RouteCard.tsx`:

```tsx
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, danger } from '../theme/tokens';
import { type } from '../theme/type';
import { RouteOption } from '../data/types';
import { HazardCount } from '../lib/scoring';

interface Props {
  route: RouteOption;
  counts: HazardCount;
  selected: boolean;
  isSafest: boolean;
  onPress: () => void;
  testID?: string;
}

export function RouteCard({ route, counts, selected, isSafest, onPress, testID }: Props) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress}
      style={[styles.card, selected && styles.selected]}>
      <View style={styles.headRow}>
        <Text style={[type.displaySm, { color: colors.ink }]}>{route.durationMin} min</Text>
        {isSafest && (
          <View style={styles.tag}>
            <Text style={[type.bodySmStrong, { color: colors.onPrimary }]}>Safest</Text>
          </View>
        )}
      </View>

      <Text style={[type.bodySm, { color: colors.body }]}>
        {route.distanceKm} km · {route.label}
      </Text>

      <View style={styles.hazardRow}>
        {counts.total === 0 ? (
          <Text style={[type.bodySmStrong, { color: colors.body }]}>No known hazards</Text>
        ) : (
          <>
            <View style={styles.dots}>
              {counts.dangerous > 0 && <View style={[styles.dot, { backgroundColor: danger.dangerous.color }]} />}
              {counts.moderate  > 0 && <View style={[styles.dot, { backgroundColor: danger.moderate.color }]} />}
              {counts.low       > 0 && <View style={[styles.dot, { backgroundColor: danger.low.color }]} />}
            </View>
            <Text style={[type.bodySmStrong, { color: colors.ink }]}>
              {counts.total} hazard{counts.total === 1 ? '' : 's'}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas, borderRadius: radii.xl, padding: spacing.lg,
    borderWidth: 2, borderColor: colors.canvasSoft, gap: spacing.xxs,
  },
  selected: { borderColor: colors.ink },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { backgroundColor: colors.primary, borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: spacing.md },
  hazardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: radii.full },
});
```

- [ ] **Step 4: Write the routes screen**

Create `app/routes.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView from '../src/map/MapView';
import { Sheet } from '../src/components/Sheet';
import { Button } from '../src/components/Button';
import { RouteCard } from '../src/components/RouteCard';
import { ROUTES } from '../src/data/routes';
import { HAZARDS } from '../src/data/hazards';
import { PLACES } from '../src/data/places';
import { ORIGIN } from '../src/data/locale';
import { activeHazardsForRoute, countByLevel, safestRouteId } from '../src/lib/scoring';
import { colors, spacing } from '../src/theme/tokens';
import { type } from '../src/theme/type';

export default function Routes() {
  const router = useRouter();
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const place = PLACES.find((p) => p.id === placeId) ?? PLACES[2];

  const at = useMemo(() => new Date(), []);
  const safest = useMemo(() => safestRouteId(ROUTES, HAZARDS, at), [at]);
  const [selectedId, setSelectedId] = useState(safest);

  const selectedRoute = ROUTES.find((r) => r.id === selectedId)!;
  const shownHazards = useMemo(
    () => activeHazardsForRoute(selectedRoute, HAZARDS, at),
    [selectedRoute, at],
  );

  return (
    <View style={styles.root}>
      <MapView center={ORIGIN} zoom={13} routes={ROUTES} activeRouteId={selectedId}
        hazards={shownHazards} onHazardPress={(id) => router.push(`/hazard/${id}`)} />

      <Sheet style={styles.sheet}>
        <Text style={[type.displaySm, { color: colors.ink }]}>{place.name}</Text>
        <Text style={[type.bodySm, { color: colors.body, marginBottom: spacing.lg }]}>{place.address}</Text>

        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: spacing.md }}>
          {ROUTES.map((r) => (
            <RouteCard
              key={r.id}
              testID={`route-${r.id}`}
              route={r}
              counts={countByLevel(activeHazardsForRoute(r, HAZARDS, at))}
              selected={r.id === selectedId}
              isSafest={r.id === safest}
              onPress={() => setSelectedId(r.id)}
            />
          ))}
        </ScrollView>

        <Button testID="start-btn" label="Start ride" variant="large" style={{ marginTop: spacing.lg }}
          onPress={() => router.push(`/navigate?routeId=${selectedId}`)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
```

- [ ] **Step 5: Run tests**

Run: `npm test -- route`
Expected: PASS, 9 tests

- [ ] **Step 6: Commit**

```bash
git add app/routes.tsx src/components/RouteCard.tsx app/__tests__/routes.test.tsx src/components/__tests__/routeCard.test.tsx
git commit -m "feat: add route selection with hazard-aware cards"
```

---

### Task 13: Hazard detail with photo history

**Files:**
- Create: `app/hazard/[id].tsx`, `src/components/PhotoCarousel.tsx`
- Test: `app/__tests__/hazard.test.tsx`

**Interfaces:**
- Consumes: `HAZARDS`, `KIND_LABEL`; `DangerBadge`, `ConfidenceBar`, `Button`
- Produces: route `/hazard/[id]`, `PhotoCarousel({ reports })`

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/hazard.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Hazard from '../hazard/[id]';

const push = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'hz-1' }),
}));

beforeEach(() => push.mockClear());

describe('Hazard detail', () => {
  it('names the hazard kind and street', () => {
    render(<Hazard />);
    expect(screen.getByText('Construction')).toBeTruthy();
    expect(screen.getByText(/Crown St/)).toBeTruthy();
  });

  it('shows the danger tier and AI confidence', () => {
    render(<Hazard />);
    expect(screen.getByText('Dangerous')).toBeTruthy();
    expect(screen.getByText('89%')).toBeTruthy();
  });

  it('shows every report photo from every user, newest first', () => {
    render(<Hazard />);
    expect(screen.getByText(/Dan/)).toBeTruthy();
    expect(screen.getByText(/Mia/)).toBeTruthy();
    expect(screen.getByTestId('photo-0').props.children).toContain('Dan');
  });

  it('routes into the fix flow carrying the hazard id', () => {
    render(<Hazard />);
    fireEvent.press(screen.getByText('Report as fixed'));
    expect(push).toHaveBeenCalledWith('/report/capture?fixHazardId=hz-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- hazard`
Expected: FAIL, "Cannot find module '../hazard/[id]'"

- [ ] **Step 3: Write PhotoCarousel**

Photos are fixtures, not real files — each renders as a labelled placeholder tile so the history reads correctly without bundling images.

Create `src/components/PhotoCarousel.tsx`:

```tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, danger } from '../theme/tokens';
import { type } from '../theme/type';
import { HazardReport } from '../data/types';

interface Props { reports: HazardReport[] }

const when = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

export function PhotoCarousel({ reports }: Props) {
  const newestFirst = [...reports].reverse();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {newestFirst.map((r, i) => (
        <View key={r.id} style={styles.tile}>
          <View style={styles.photo}>
            <Text testID={`photo-${i}`} style={[type.caption, { color: colors.body }]}>
              {`${r.photo} · ${r.reporterName}`}
            </Text>
            {r.intent === 'fix' && (
              <View style={styles.fixTag}>
                <Text style={[type.caption, { color: colors.onPrimary }]}>Fix</Text>
              </View>
            )}
          </View>
          <Text style={[type.bodySmStrong, { color: colors.ink }]}>{r.reporterName}</Text>
          <Text style={[type.caption, { color: colors.body }]}>{when(r.reportedAt)}</Text>
          <View style={styles.tierRow}>
            <View style={[styles.dot, { backgroundColor: danger[r.ai.dangerLevel].color }]} />
            <Text style={[type.caption, { color: colors.body }]}>
              {Math.round(r.ai.confidence * 100)}% confident
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.md, paddingVertical: spacing.sm },
  tile: { width: 160, gap: 2 },
  photo: {
    width: 160, height: 120, borderRadius: radii.lg, backgroundColor: colors.canvasSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, padding: spacing.sm,
  },
  fixTag: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: radii.full },
});
```

- [ ] **Step 4: Write the hazard detail screen**

Create `app/hazard/[id].tsx`:

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HAZARDS } from '../../src/data/hazards';
import { KIND_LABEL } from '../../src/data/types';
import { DangerBadge } from '../../src/components/DangerBadge';
import { ConfidenceBar } from '../../src/components/ConfidenceBar';
import { PhotoCarousel } from '../../src/components/PhotoCarousel';
import { Button } from '../../src/components/Button';
import { colors, spacing } from '../../src/theme/tokens';
import { type } from '../../src/theme/type';

export default function Hazard() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hazard = HAZARDS.find((h) => h.id === id);

  if (!hazard) {
    return (
      <View style={styles.root}>
        <Text style={[type.bodyMd, { color: colors.body }]}>That hazard no longer exists.</Text>
      </View>
    );
  }

  const latest = hazard.reports[hazard.reports.length - 1];
  const reportedDays = Math.round((Date.now() - Date.parse(latest.reportedAt)) / 86_400_000);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxxl }}>
      <View>
        <Text style={[type.displayMd, { color: colors.ink }]}>{KIND_LABEL[hazard.kind]}</Text>
        <Text style={[type.bodySm, { color: colors.body }]}>
          {hazard.streetName} · last updated {reportedDays}d ago
        </Text>
      </View>

      <DangerBadge level={hazard.dangerLevel} />

      <Text style={[type.bodyMd, { color: colors.ink }]}>{latest.ai.caption}</Text>

      <ConfidenceBar value={latest.ai.confidence} />

      <View>
        <Text style={[type.bodyMdStrong, { color: colors.ink, marginBottom: spacing.xs }]}>
          Reported by {hazard.reports.length} {hazard.reports.length === 1 ? 'rider' : 'riders'}
        </Text>
        <Text style={[type.bodySm, { color: colors.body }]}>
          Every photo submitted here, newest first. Judge it for yourself.
        </Text>
        <PhotoCarousel reports={hazard.reports} />
      </View>

      <Button label="Report as fixed" variant="primary"
        onPress={() => router.push(`/report/capture?fixHazardId=${hazard.id}`)} />
      <Button label="Report incorrect" variant="subtle" onPress={() => {}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg, paddingTop: spacing.xxxl },
});
```

- [ ] **Step 5: Run tests**

Run: `npm test -- hazard`
Expected: PASS, 4 tests

- [ ] **Step 6: Commit**

```bash
git add app/hazard src/components/PhotoCarousel.tsx app/__tests__/hazard.test.tsx
git commit -m "feat: add hazard detail with multi-user photo history"
```

---

### Task 14: Turn-by-turn navigation

**Files:**
- Create: `app/navigate.tsx`, `src/components/ManeuverBanner.tsx`
- Test: `app/__tests__/navigate.test.tsx`

**Interfaces:**
- Consumes: `ROUTES`, `HAZARDS`; `activeHazardsForRoute`; `haversineMeters`; `MapView`
- Produces: route `/navigate`, `ManeuverBanner({ step, distanceM })`

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/navigate.test.tsx`:

```tsx
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import Navigate from '../navigate';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ routeId: 'rt-fast' }),
}));

jest.useFakeTimers();

describe('Navigation', () => {
  it('shows the first maneuver on entry', () => {
    render(<Navigate />);
    expect(screen.getByText('Head north on Corrimal St')).toBeTruthy();
  });

  it('shows remaining time and distance', () => {
    render(<Navigate />);
    expect(screen.getByTestId('nav-footer')).toBeTruthy();
  });

  it('advances to the next maneuver as the ride progresses', () => {
    render(<Navigate />);
    act(() => { jest.advanceTimersByTime(6000); });
    expect(screen.getByText('Turn left onto Crown St')).toBeTruthy();
  });

  it('warns about a hazard ahead on a hazardous route', () => {
    render(<Navigate />);
    expect(screen.getByTestId('hazard-warning')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- navigate`
Expected: FAIL, "Cannot find module '../navigate'"

- [ ] **Step 3: Write ManeuverBanner**

Create `src/components/ManeuverBanner.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type } from '../theme/type';
import { ManeuverStep } from '../data/types';

const GLYPH: Record<ManeuverStep['modifier'], string> = {
  left: '←', right: '→', straight: '↑',
  'slight-left': '↖', 'slight-right': '↗', arrive: '◉',
};

interface Props { step: ManeuverStep; distanceM: number }

export function ManeuverBanner({ step, distanceM }: Props) {
  return (
    <View style={[styles.banner, shadows.level2]}>
      <Text style={styles.glyph}>{GLYPH[step.modifier]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[type.bodySmStrong, { color: colors.mute }]}>
          {distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM} m`}
        </Text>
        <Text style={[type.displaySm, { color: colors.onDark }]}>{step.instruction}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    backgroundColor: colors.ink, borderRadius: radii.xl, padding: spacing.lg,
  },
  glyph: { color: colors.onDark, fontSize: 34, lineHeight: 40 },
});
```

- [ ] **Step 4: Write the navigation screen**

Create `app/navigate.tsx`. A timer walks an index along `route.geometry` so the map, banner, and progress all animate off one piece of state.

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView from '../src/map/MapView';
import { ManeuverBanner } from '../src/components/ManeuverBanner';
import { Button } from '../src/components/Button';
import { ROUTES } from '../src/data/routes';
import { HAZARDS } from '../src/data/hazards';
import { KIND_LABEL } from '../src/data/types';
import { activeHazardsForRoute } from '../src/lib/scoring';
import { haversineMeters } from '../src/lib/geo';
import { colors, radii, spacing, shadows, danger } from '../src/theme/tokens';
import { type } from '../src/theme/type';

const TICK_MS = 3000;

export default function Navigate() {
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const route = ROUTES.find((r) => r.id === routeId) ?? ROUTES[0];

  const [idx, setIdx] = useState(0);
  const at = useMemo(() => new Date(), []);

  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => Math.min(i + 1, route.geometry.length - 1)),
      TICK_MS,
    );
    return () => clearInterval(t);
  }, [route.geometry.length]);

  const here = route.geometry[idx];

  const step = useMemo(
    () => [...route.steps].reverse().find((s) => s.atIndex <= idx) ?? route.steps[0],
    [route.steps, idx],
  );

  const nextStep = route.steps.find((s) => s.atIndex > idx) ?? step;
  const toNextM = Math.round(haversineMeters(here, route.geometry[nextStep.atIndex] ?? here));

  const progress = idx / (route.geometry.length - 1);
  const remainingMin = Math.max(1, Math.round(route.durationMin * (1 - progress)));
  const remainingKm = (route.distanceKm * (1 - progress)).toFixed(1);

  // Warn about the nearest active hazard still ahead of us.
  const hazardAhead = useMemo(() => {
    const active = activeHazardsForRoute(route, HAZARDS, at);
    return active
      .map((h) => ({ h, d: Math.round(haversineMeters(here, h.coord)) }))
      .filter((x) => x.d < 900)
      .sort((a, b) => a.d - b.d)[0];
  }, [route, at, here]);

  return (
    <View style={styles.root}>
      <MapView center={here} zoom={16} routes={[route]} activeRouteId={route.id}
        hazards={activeHazardsForRoute(route, HAZARDS, at)} userLocation={here} />

      <View style={styles.top}>
        <ManeuverBanner step={nextStep} distanceM={toNextM} />

        {hazardAhead && (
          <View testID="hazard-warning" style={[styles.warn, shadows.level2,
            { borderLeftColor: danger[hazardAhead.h.dangerLevel].color }]}>
            <Text style={[type.bodyMdStrong, { color: colors.ink }]}>
              {KIND_LABEL[hazardAhead.h.kind]} ahead
            </Text>
            <Text style={[type.bodySm, { color: colors.body }]}>
              {hazardAhead.d} m · {hazardAhead.h.streetName}
            </Text>
          </View>
        )}
      </View>

      <View testID="nav-footer" style={[styles.footer, shadows.level2]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={styles.footRow}>
          <View>
            <Text style={[type.displaySm, { color: colors.ink }]}>{remainingMin} min</Text>
            <Text style={[type.bodySm, { color: colors.body }]}>{remainingKm} km remaining</Text>
          </View>
          <Button label="End" variant="subtle" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  top: { position: 'absolute', top: spacing.xxxl, left: spacing.lg, right: spacing.lg, gap: spacing.md },
  warn: {
    backgroundColor: colors.canvas, borderRadius: radii.lg,
    borderLeftWidth: 5, padding: spacing.lg, gap: 2,
  },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    padding: spacing.lg, gap: spacing.lg,
  },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: { height: 4, borderRadius: radii.pill, backgroundColor: colors.canvasSoft, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.ink, borderRadius: radii.pill },
});
```

- [ ] **Step 5: Run tests**

Run: `npm test -- navigate`
Expected: PASS, 4 tests

- [ ] **Step 6: Commit**

```bash
git add app/navigate.tsx src/components/ManeuverBanner.tsx app/__tests__/navigate.test.tsx
git commit -m "feat: add turn-by-turn navigation with hazard-ahead warnings"
```

---

### Task 15: Report flow

**Files:**
- Create: `app/report/capture.tsx`, `app/report/gate.tsx`, `app/report/analysis.tsx`, `app/report/done.tsx`
- Test: `app/__tests__/report.test.tsx`

**Interfaces:**
- Consumes: `checkGate`, `GATE_RADIUS_M` from `src/lib/geo`; `analyzeReportPhoto`, `analyzeFixPhoto` from `src/lib/fakeAI`; `HAZARDS`, `ORIGIN`; `DangerBadge`, `ConfidenceBar`, `Button`
- Produces: routes `/report/capture`, `/report/gate`, `/report/analysis`, `/report/done`. Each carries `fixHazardId` through when present.

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/report.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import Gate from '../report/gate';
import Analysis from '../report/analysis';

const push = jest.fn();
let params: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push, back: jest.fn(), replace: push }),
  useLocalSearchParams: () => params,
}));

beforeEach(() => { push.mockClear(); params = {}; });

describe('GPS gate', () => {
  it('allows submission when the rider is at the hazard', () => {
    render(<Gate />);
    expect(screen.getByTestId('gate-allowed')).toBeTruthy();
  });

  it('blocks submission and shows the distance when too far', () => {
    render(<Gate />);
    fireEvent.press(screen.getByTestId('simulate-far'));
    expect(screen.getByTestId('gate-blocked')).toBeTruthy();
    expect(screen.getByText(/m away/)).toBeTruthy();
  });

  it('disables continue while blocked', () => {
    render(<Gate />);
    fireEvent.press(screen.getByTestId('simulate-far'));
    fireEvent.press(screen.getByTestId('gate-continue'));
    expect(push).not.toHaveBeenCalled();
  });
});

describe('AI analysis', () => {
  it('shows a working state then the verdict', async () => {
    jest.useFakeTimers();
    render(<Analysis />);
    expect(screen.getByTestId('analysing')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(2000); });
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());
    jest.useRealTimers();
  });

  it('surfaces the confidence score for the rider to check', async () => {
    jest.useFakeTimers();
    render(<Analysis />);
    await act(async () => { jest.advanceTimersByTime(2000); });
    await waitFor(() => expect(screen.getByText('AI confidence')).toBeTruthy());
    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- report`
Expected: FAIL, "Cannot find module '../report/gate'"

- [ ] **Step 3: Write the capture screen**

Create `app/report/capture.tsx`. A framed viewfinder placeholder — no camera permission in the draft.

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { type } from '../../src/theme/type';

export default function Capture() {
  const router = useRouter();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();
  const qs = fixHazardId ? `?fixHazardId=${fixHazardId}` : '';

  return (
    <View style={styles.root}>
      <Text style={[type.displayMd, { color: colors.ink }]}>
        {fixHazardId ? 'Show us it’s fixed' : 'Photograph the hazard'}
      </Text>
      <Text style={[type.bodyMd, { color: colors.body }]}>
        {fixHazardId
          ? 'Take a clear photo of the same spot so other riders can see the change.'
          : 'Get the whole obstruction in frame. Other riders will see this photo.'}
      </Text>

      <View style={styles.viewfinder}>
        <View style={styles.reticle} />
        <Text style={[type.bodySm, { color: colors.body }]}>Camera preview</Text>
      </View>

      <Button testID="shutter" label="Take photo" variant="large"
        onPress={() => router.push(`/report/gate${qs}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg, paddingTop: spacing.xxxl, gap: spacing.md },
  viewfinder: {
    flex: 1, borderRadius: radii.xl, backgroundColor: colors.canvasSoft,
    alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginVertical: spacing.lg,
  },
  reticle: { width: 140, height: 140, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.mute },
});
```

- [ ] **Step 4: Write the GPS gate screen**

Create `app/report/gate.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { checkGate, GATE_RADIUS_M } from '../../src/lib/geo';
import { ORIGIN } from '../../src/data/locale';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { type } from '../../src/theme/type';

// Demo positions: standing at the hazard, and 780m away.
const AT_HAZARD = ORIGIN;
const FAR_AWAY = { lng: 150.9012, lat: -34.4265 };

export default function Gate() {
  const router = useRouter();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();
  const qs = fixHazardId ? `?fixHazardId=${fixHazardId}` : '';

  const [user, setUser] = useState(AT_HAZARD);
  const { withinRange, distanceM } = checkGate(user, ORIGIN);

  return (
    <View style={styles.root}>
      <Text style={[type.displayMd, { color: colors.ink }]}>Confirming you’re here</Text>
      <Text style={[type.bodyMd, { color: colors.body }]}>
        Reports can only be submitted from the hazard itself. It keeps the map honest.
      </Text>

      <View style={[styles.status, withinRange ? styles.ok : styles.bad]}>
        <Text style={[type.displayLg, { color: colors.ink }]}>
          {withinRange ? 'Location confirmed' : `${distanceM} m away`}
        </Text>
        <Text style={[type.bodySm, { color: colors.body }]}>
          {withinRange
            ? `Within ${GATE_RADIUS_M} m of the hazard.`
            : `Move within ${GATE_RADIUS_M} m to submit this report.`}
        </Text>
      </View>

      {withinRange
        ? <View testID="gate-allowed" />
        : <View testID="gate-blocked" />}

      <View style={{ gap: spacing.md }}>
        <Button
          testID="gate-continue"
          label="Continue"
          variant="large"
          disabled={!withinRange}
          onPress={() => { if (withinRange) router.push(`/report/analysis${qs}`); }}
        />
        <Button
          testID={user === AT_HAZARD ? 'simulate-far' : 'simulate-near'}
          label={user === AT_HAZARD ? 'Simulate being far away' : 'Simulate being at the hazard'}
          variant="subtle"
          onPress={() => setUser(user === AT_HAZARD ? FAR_AWAY : AT_HAZARD)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg, paddingTop: spacing.xxxl, gap: spacing.lg },
  status: { borderRadius: radii.xl, padding: spacing.xxl, gap: spacing.xs, marginTop: spacing.lg },
  ok: { backgroundColor: colors.canvasSoft },
  bad: { backgroundColor: colors.canvasSoft, borderWidth: 2, borderColor: colors.ink },
});
```

- [ ] **Step 5: Write the analysis screen**

Create `app/report/analysis.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { DangerBadge } from '../../src/components/DangerBadge';
import { ConfidenceBar } from '../../src/components/ConfidenceBar';
import { analyzeReportPhoto, analyzeFixPhoto } from '../../src/lib/fakeAI';
import { HAZARDS } from '../../src/data/hazards';
import { AIVerdict, KIND_LABEL } from '../../src/data/types';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { type } from '../../src/theme/type';

export default function Analysis() {
  const router = useRouter();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();
  const [verdict, setVerdict] = useState<AIVerdict | null>(null);

  useEffect(() => {
    let live = true;
    const hazard = HAZARDS.find((h) => h.id === fixHazardId);
    const p = hazard ? analyzeFixPhoto(hazard.kind) : analyzeReportPhoto(0);
    p.then((v) => { if (live) setVerdict(v); });
    return () => { live = false; };
  }, [fixHazardId]);

  if (!verdict) {
    return (
      <View testID="analysing" style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.ink} />
        <Text style={[type.displaySm, { color: colors.ink }]}>Reading your photo</Text>
        <Text style={[type.bodySm, { color: colors.body, textAlign: 'center' }]}>
          Classifying the hazard and estimating how risky it is for riders.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={[type.displayMd, { color: colors.ink }]}>Here’s what we found</Text>

      <View testID="verdict" style={styles.photo}>
        <Text style={[type.bodySm, { color: colors.body }]}>Your photo</Text>
      </View>

      <Text style={[type.displaySm, { color: colors.ink }]}>{KIND_LABEL[verdict.kind]}</Text>
      <DangerBadge level={verdict.dangerLevel} />
      <Text style={[type.bodyMd, { color: colors.ink }]}>{verdict.caption}</Text>

      <ConfidenceBar value={verdict.confidence} />
      <Text style={[type.caption, { color: colors.body }]}>
        Check the photo against this rating. If it looks wrong, change it before submitting.
      </Text>

      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        <Button label={fixHazardId ? 'Submit fix' : 'Submit report'} variant="large"
          onPress={() => router.push(`/report/done${fixHazardId ? `?fixHazardId=${fixHazardId}` : ''}`)} />
        <Button label="Change the rating" variant="subtle" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg, paddingTop: spacing.xxxl, gap: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  photo: {
    height: 180, borderRadius: radii.xl, backgroundColor: colors.canvasSoft,
    alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm,
  },
});
```

- [ ] **Step 6: Write the done screen**

Create `app/report/done.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { type } from '../../src/theme/type';

export default function Done() {
  const router = useRouter();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();

  return (
    <View style={[styles.root, styles.center]}>
      <View style={styles.mark}><Text style={styles.tick}>✓</Text></View>

      <Text style={[type.displayMd, { color: colors.ink, textAlign: 'center' }]}>
        {fixHazardId ? 'Marked as fixed' : 'Report submitted'}
      </Text>
      <Text style={[type.bodyMd, { color: colors.body, textAlign: 'center' }]}>
        {fixHazardId
          ? 'This hazard is off the map. Thanks for closing the loop.'
          : 'Riders routing through here will see it from now on.'}
      </Text>

      <Button label="Back to map" variant="large" style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
        onPress={() => router.push('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  mark: {
    width: 88, height: 88, borderRadius: radii.full,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  tick: { color: colors.onPrimary, fontSize: 40, lineHeight: 46 },
});
```

- [ ] **Step 7: Run tests**

Run: `npm test -- report`
Expected: PASS, 5 tests

- [ ] **Step 8: Commit**

```bash
git add app/report app/__tests__/report.test.tsx
git commit -m "feat: add report and mark-as-fixed flow with GPS gate"
```

---

### Task 16: My reports and onboarding

**Files:**
- Create: `app/(tabs)/reports.tsx`, `app/onboarding.tsx`
- Test: `app/__tests__/reports.test.tsx`

**Interfaces:**
- Consumes: `HAZARDS`, `KIND_LABEL`; `DangerBadge`
- Produces: routes `/reports`, `/onboarding`

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/reports.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Reports from '../(tabs)/reports';

const push = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push, back: jest.fn() }) }));

beforeEach(() => push.mockClear());

describe('My reports', () => {
  it('lists hazards with their kind', () => {
    render(<Reports />);
    expect(screen.getByText('Construction')).toBeTruthy();
  });

  it('distinguishes active from fixed', () => {
    render(<Reports />);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getByText('Fixed')).toBeTruthy();
  });

  it('opens the hazard detail on tap', () => {
    render(<Reports />);
    fireEvent.press(screen.getByTestId('report-hz-1'));
    expect(push).toHaveBeenCalledWith('/hazard/hz-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports`
Expected: FAIL, "Cannot find module '../(tabs)/reports'"

- [ ] **Step 3: Write the reports screen**

Replace `app/(tabs)/reports.tsx`:

```tsx
import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { HAZARDS } from '../../src/data/hazards';
import { KIND_LABEL } from '../../src/data/types';
import { DangerBadge } from '../../src/components/DangerBadge';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { type } from '../../src/theme/type';

export default function Reports() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <Text style={[type.displayMd, { color: colors.ink, marginBottom: spacing.lg }]}>Reports</Text>

      <FlatList
        data={HAZARDS}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable testID={`report-${item.id}`} style={styles.row}
            onPress={() => router.push(`/hazard/${item.id}`)}>
            <View style={styles.rowHead}>
              <Text style={[type.bodyMdStrong, { color: colors.ink }]}>{KIND_LABEL[item.kind]}</Text>
              <View style={[styles.status, item.status === 'fixed' && styles.statusFixed]}>
                <Text style={[type.caption, { color: item.status === 'fixed' ? colors.onPrimary : colors.ink }]}>
                  {item.status === 'fixed' ? 'Fixed' : 'Active'}
                </Text>
              </View>
            </View>
            <Text style={[type.bodySm, { color: colors.body, marginBottom: spacing.sm }]}>
              {item.streetName} · {item.reports.length} photo{item.reports.length === 1 ? '' : 's'}
            </Text>
            <DangerBadge level={item.dangerLevel} compact />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg, paddingTop: spacing.xxxl },
  row: { backgroundColor: colors.canvas, borderRadius: radii.xl, borderWidth: 2, borderColor: colors.canvasSoft, padding: spacing.lg },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  status: { backgroundColor: colors.canvasSoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  statusFixed: { backgroundColor: colors.primary },
});
```

- [ ] **Step 4: Write the onboarding screen**

Create `app/onboarding.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors, radii, spacing } from '../src/theme/tokens';
import { type } from '../src/theme/type';

const NEEDS = [
  { title: 'Your location', body: 'To route you from where you are, and to confirm you’re at a hazard when you report one.' },
  { title: 'Your camera', body: 'Reports are photo-first. Riders trust what they can see.' },
];

export default function Onboarding() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <Text style={[type.displayXl, { color: colors.ink }]}>Ride the safer way</Text>
      <Text style={[type.bodyLg, { color: colors.body }]}>
        Routes that route you around what other riders have already found.
      </Text>

      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {NEEDS.map((n) => (
          <View key={n.title} style={styles.card}>
            <Text style={[type.bodyMdStrong, { color: colors.ink }]}>{n.title}</Text>
            <Text style={[type.bodySm, { color: colors.body }]}>{n.body}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <Button label="Get started" variant="large" onPress={() => router.push('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg, paddingTop: spacing.xxxl * 2, gap: spacing.md },
  card: { backgroundColor: colors.canvasSoft, borderRadius: radii.xl, padding: spacing.xxl, gap: spacing.xxs },
});
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, all suites green

- [ ] **Step 6: Verify every screen on web**

Run: `npx expo start --web`

Walk the flows:
- Map → time chip toggles hazard count → tap a pin → hazard detail with photo history
- Map → Where to? → search "beach" → route cards → Start ride → navigation advances, hazard warning appears
- Map → Report a hazard → shutter → gate (simulate far, confirm blocked) → simulate near → analysis → submit → done
- Hazard detail → Report as fixed → same flow, "Marked as fixed" copy
- Reports tab → tap a row → hazard detail

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/reports.tsx app/onboarding.tsx app/__tests__/reports.test.tsx
git commit -m "feat: add reports list and onboarding"
```

---

## Self-Review Notes

**Spec coverage:** All 11 screens from spec §6 have tasks (10, 11, 12, 13, 14, 15, 16). All six resolved requirements from spec §5 are implemented — time-awareness (Tasks 5, 10), ETA-led route cards (12), turn-by-turn (14), multi-user photo history (13), hard GPS gate (4, 15), any-user fix flow (15). Data model §4 is Task 3. Design system §2 is Task 2, consumed everywhere.

**Type consistency:** `HazardCount` is defined in Task 6 and consumed by `RouteCard` in Task 12. `MapViewProps` is defined in Task 9 and consumed by Tasks 10, 12, 14. `AIVerdict` flows from Task 3 → Task 7 → Task 15. `KIND_LABEL` is defined in Task 3 and used in Tasks 13, 14, 15, 16.

**Known deviation:** Task 9 splits GeoJSON helpers into `src/map/geojson.ts` rather than `types.ts`, so the file structure lists both.
