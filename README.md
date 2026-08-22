# CycleSafe

Safer cycling routes, built from hazards other riders have already found.

Two projects in one repo:

| | |
|---|---|
| [`frontend/`](./frontend) | Expo / React Native app — map, routing, reporting. iOS is the primary target; the web build runs everywhere. |
| [`backend/`](./backend) | NestJS API — hazard and report storage in SQLite, photo uploads, OpenAI photo classification. |

## Getting started

Two terminals. API first, because the app reports to it:

```bash
cd backend
npm install
cp .env.example .env      # add OPENAI_API_KEY, or leave it blank
npm run dev               # http://localhost:3000
```

```bash
cd frontend
npm install
npm run web               # fastest way in
```

For iOS, `npx expo run:ios` — the app uses native map, camera and location
modules, so Expo Go will not work. Full setup, including the build failures
worth knowing about, is in [frontend/SETUP.md](./frontend/SETUP.md).

## How the two fit together

The app reads hazards from `GET /api/hazards` and falls back to bundled
fixtures when the API is unreachable, so it stays demoable on a laptop with
nothing else running — `frontend/src/data/useHazards.ts` reports which source
is live. Reporting needs the API: a photo goes to `POST /api/reports`, which
stores it, classifies it, and either attaches it to a nearby hazard or opens a
new one.

Set `EXPO_PUBLIC_API_URL` if the API isn't on `localhost:3000`. On a phone the
app reuses the LAN address Metro is already serving from.

**The API runs without an OpenAI key.** Photo analysis returns a verdict marked
as a fallback, and the app says "Not analysed" rather than showing an invented
result. `curl localhost:3000/api/health` tells you which mode you're in.

## Tests

```bash
cd frontend && npm test    # 154
cd backend  && npm test    # 11
```

## Not built

Auth, real routing (the router still reads bundled fixtures), live directions,
offline maps, background GPS, voice guidance. Android is untested — no SDK on
the dev machine.
