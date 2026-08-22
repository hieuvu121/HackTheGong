# CycleSafe — UI Draft Design Spec

**Date:** 2026-08-22
**Status:** Approved
**Scope:** Interactive UI draft. Real interactions, mocked data. No backend, no model calls, no live Directions API.

---

## 1. Product

A mobile app for cyclists with two functions:

1. **Safe routing** — pick a destination, see multiple route options with hazards marked, inspect any hazard, choose a route, navigate turn-by-turn.
2. **Hazard reporting** — photograph a hazard while physically at it, have AI classify it, and let any later user photograph it again to mark it fixed.

## 2. Design system

Driven entirely by `DESIGN.md` (Uber-inspired mono system).

- **Surfaces / type / CTAs:** black-and-white only. Black pill is the sole conversion colour. `Inter` substitutes for UberMove (700 display) and UberMoveText (400/500 text).
- **Shape:** pill (999px) on every interactive element; 16px on cards; 8px on inputs.
- **One deliberate deviation:** a 3-tone safety accent, used **only** on hazard markers, danger badges, and the confidence bar. Never on buttons, never on CTAs.

| Tier | Colour | Route weighting (production) |
|---|---|---|
| Dangerous | `#d6202a` | `multiply_by 0.1` |
| Moderate | `#f5a623` | `multiply_by 0.5` |
| Low | `#1a9e5a` | `multiply_by 0.85` |

Tier is also encoded by pin fill (solid / half / outline) so it survives greyscale printing and colour-blindness.

## 3. Stack

**Expo SDK 57 + Expo Router**, TypeScript. **Native (iOS) is the primary target**; web runs too and is useful for fast iteration.

The map is the one platform-split module, because no single map library renders on both native and web:

| Platform | Renderer | How to run |
|---|---|---|
| iOS (primary) | `@maplibre/maplibre-react-native` | `npx expo run:ios` — needs a dev build, **not Expo Go** |
| Web (secondary) | `maplibre-gl` v5 | `npm run web` |

Both load the **same Positron style URL** and declare the same layer ids and paint expressions, so the map looks identical on both. Screens import `src/map/MapView` and never know which one they got.

**Prerequisites for iOS:** Xcode, and CocoaPods installed via Homebrew (`brew install cocoapods`) — macOS system Ruby is 2.6, too old for current CocoaPods.

| | Draft (this spec) | Production |
|---|---|---|
| Tiles | OpenFreeMap `positron` (keyless) | Self-hosted or MapTiler/Mapbox vector tiles |
| Routes | Hardcoded GeoJSON + realistic ETAs | GraphHopper `custom_model` with hazard polygons |
| Search | Mocked place list | Mapbox Search Box / Photon |
| AI | Scripted verdict, 1.6s delay | Vision model endpoint |

`src/map/MapView.web.tsx` / `MapView.native.tsx` share one props interface, so swapping providers never touches a screen.

**Version pin:** `maplibre-gl` is held at v5. v6 is ESM-only with a separate module worker that Metro cannot emit — the map renders chrome but silently loads zero tiles, with no error anywhere. Do not upgrade without re-verifying tiles actually appear.

**Mock locale:** Wollongong NSW (`-34.4278, 150.8931`), set by a single constant in `src/data/locale.ts`.

## 4. Data model

```ts
type DangerLevel  = 'dangerous' | 'moderate' | 'low';
type HazardStatus = 'active' | 'fixed';
type HazardKind   = 'construction' | 'unlit' | 'pothole' | 'highway' | 'debris' | 'no_bike_lane';

interface LngLat     { lng: number; lat: number }
interface TimeWindow { startMin: number; endMin: number }   // minutes from midnight; wraps past 1440

interface AIVerdict {
  kind: HazardKind;
  dangerLevel: DangerLevel;
  confidence: number;        // 0..1, shown to the user
  caption: string;
}

interface HazardReport {     // one photo submission by one user
  id: string;
  hazardId: string;
  photo: string;
  reportedAt: string;        // ISO
  reporterName: string;
  intent: 'report' | 'fix';
  ai: AIVerdict;
}

interface Hazard {
  id: string;
  coord: LngLat;
  kind: HazardKind;
  dangerLevel: DangerLevel;  // from the newest 'report' submission
  status: HazardStatus;
  activeWindow?: TimeWindow; // unlit roads are hazards only after dark
  reports: HazardReport[];   // chronological, oldest first
  streetName: string;
}

interface ManeuverStep {
  id: string;
  instruction: string;
  modifier: 'left' | 'right' | 'straight' | 'slight-left' | 'slight-right' | 'arrive';
  distanceM: number;
  atIndex: number;           // index into RouteOption.geometry
}

interface RouteOption {
  id: string;
  label: string;             // "via Cliff Rd"
  durationMin: number;
  distanceKm: number;
  geometry: LngLat[];
  steps: ManeuverStep[];
  hazardIds: string[];
}
```

## 5. Resolved requirements

| # | Question | Resolution |
|---|---|---|
| 1 | Time-of-day | **Time-aware.** Unlit roads are hazards only inside `activeWindow`. Map carries a "Leaving now ▾" chip; changing it recomputes every route's hazard count. |
| 2 | Route differentiation | **Google-style.** ETA is the headline; each card also shows distance, street label, and a hazard-count badge broken down by tier. |
| 3 | After picking | **Full turn-by-turn**, Google/Uber-style: maneuver banner, progress, ETA footer, and a hazard-ahead warning card that appears ~150m out. |
| 4 | Photo history | Hazard detail shows **every photo from every user**, chronologically, each with its own AI verdict and confidence, so a new user can judge for themselves. Doubles as the fix-verification trail. |
| 5 | GPS gate | **Hard block** outside 75m, with a live distance readout so the block never feels arbitrary. |
| 6 | Fix lifecycle | **Any user** can mark fixed with the same GPS gate + photo. AI must agree the hazard is gone. Status flips `active` → `fixed`. |

## 6. Screens

**Route flow**
1. `(tabs)/index` — Home map: hazard pins, "Leaving now ▾" time chip, "Where to?" search bar
2. `search` — destination autocomplete over mocked places
3. `routes` — 3 route polylines + bottom sheet of ETA cards; tapping a card highlights its polyline
4. `hazard/[id]` — modal sheet: photo carousel, tier badge, AI confidence bar, age, actions
5. `navigate` — turn-by-turn with hazard-ahead warnings

**Report flow**
6. `report/capture` — camera framing
7. `report/gate` — GPS lock with live distance; blocked and allowed states both demoable
8. `report/analysis` — AI working → verdict (photo, kind, tier, confidence)
9. `report/done` — confirmation

**Plus**
10. `(tabs)/reports` — my reports with status badges
11. `onboarding` — location + camera permission priming

Mark-as-fixed reuses `report/*` with a `fixHazardId` param rather than duplicating the flow.

## 7. Out of scope

Backend, auth, real model inference, live Directions API, offline maps, background GPS, voice guidance, report-abuse resolution, hazard expiry policy. The "Report incorrect" affordance renders but is inert. Android is untested — no SDK on the dev machine.

## 8. Testing

TDD on all pure logic — `geo.ts` (haversine, gate), `time.ts` (wrapping windows), `hazards.ts` (route hazard scoring). Component tests on `RouteCard`, `ConfidenceBar`, `DangerBadge`. Smoke render per screen. `jest-expo` + `@testing-library/react-native`.
