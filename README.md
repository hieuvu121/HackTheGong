# CycleSafe

Safer cycling routes, built from hazards other riders have already found.

Two projects in one repo:

| | |
|---|---|
| [`frontend/`](./frontend) | Expo / React Native app — map, routing, reporting. iOS is the primary target; the web build runs everywhere. |
| [`backend/`](./backend) | NestJS API — hazard and report storage in SQLite, photo uploads, OpenAI photo classification. |

## Setup

### Prerequisites

| | |
|---|---|
| Node | 20+ (developed on 26) |
| npm | 10+ |
| Xcode | iOS only — install a simulator runtime via Xcode → Settings → Platforms |
| CocoaPods | iOS only — `brew install cocoapods`, **not** `gem install`: system Ruby 2.6 is too old |

The web build needs only Node and npm. Nothing else has to be installed
globally — no Expo CLI, no Nest CLI, both come from `npm install`.

### 1. Install

```bash
git clone git@github.com:hieuvu121/HackTheGong.git
cd HackTheGong

cd backend  && npm install
cd ../frontend && npm install
```

### 2. Configure the API

```bash
cd backend
cp .env.example .env
```

Every value has a working default, so a blank `.env` runs:

| | |
|---|---|
| `OPENAI_API_KEY` | Leave blank to run without photo analysis — see below. |
| `OPENAI_MODEL` | Defaults to `gpt-5.6`. |
| `PORT` | Defaults to `3000`. |
| `DATA_DIR` / `UPLOAD_DIR` | Where the SQLite file and uploaded photos land, relative to `backend/`. Both are created on first run. |

Startup seeds seven demo hazards and their photos, so the map has something on
it before anyone reports anything. It re-runs every boot but is idempotent —
anything you reported yourself is left alone.

### 3. Run

Two terminals, API first — the app reports to it:

```bash
cd backend
npm run dev               # http://localhost:3000
```

```bash
cd frontend
npm run web               # fastest way in, no native build
```

For iOS, `npx expo run:ios`. The app uses native map, camera and location
modules, so **Expo Go will not work** — it crashes on launch. The first native
build takes several minutes; after that `npm start` and press `i`.

Set `EXPO_PUBLIC_API_URL` if the API isn't on `localhost:3000`. On a phone the
app reuses the LAN address Metro is already serving from.

### 4. Check it came up

```bash
curl localhost:3000/api/health     # also tells you if the OpenAI key is good
curl localhost:3000/api/hazards    # the seeded hazards
```

The app itself will start whether or not the API is up — it falls back to
bundled fixtures, so a map full of pins is not proof the two are talking. See
[How the two fit together](#how-the-two-fit-together).

### If the iOS build fails

Two known failures — a codesign error from iCloud's extended attributes, and a
`react-native-worklets` version mismatch — both with fixes, are in
[frontend/SETUP.md](./frontend/SETUP.md).

## How the two fit together

The app reads hazards from `GET /api/hazards` and falls back to bundled
fixtures when the API is unreachable, so it stays demoable on a laptop with
nothing else running — `frontend/src/data/useHazards.ts` reports which source
is live. Reporting needs the API: a photo goes to `POST /api/reports`, which
stores it, classifies it, and either attaches it to a nearby hazard or opens a
new one.

**The API runs without an OpenAI key.** Photo analysis returns a verdict marked
as a fallback, and the app says "Not analysed" rather than showing an invented
result. `curl localhost:3000/api/health` tells you which mode you're in.

## Tests

```bash
cd frontend && npm test          # 268
cd backend  && npm test          # 64
```

There is no CI, so the typechecks are worth running yourself before pushing:

```bash
cd frontend && npx tsc --noEmit
cd backend  && npm run typecheck
```

## Not built

Auth, real routing (the router still reads bundled fixtures), live directions,
offline maps, background GPS, voice guidance. Android is untested — no SDK on
the dev machine.
