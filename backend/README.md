# CycleSafe API

Hazard reports, photo storage, and AI photo classification. NestJS + SQLite.

## Running it

```bash
cd backend
npm install
cp .env.example .env     # add your OpenAI key
npm run dev              # http://localhost:3000
```

The database file and uploaded photos are created on first run under `data/`
and `uploads/`. Both are gitignored — they hold real submissions.

**It runs without an OpenAI key.** Photo analysis falls back to a verdict
marked `source: "fallback"` with zero confidence and a caption telling the
rider to set the rating themselves. The app renders that state as "Not
analysed" rather than as a real result. Check which mode you are in:

```bash
curl localhost:3000/api/health     # {"ok":true,"aiEnabled":true}
```

## Endpoints

| | |
|---|---|
| `GET /api/health` | Liveness, and whether a model is configured |
| `GET /api/hazards` | Every hazard with its reports, shaped like the app's `Hazard` type |
| `GET /api/hazards/:id` | One hazard |
| `POST /api/analyze` | `photo` multipart → a verdict, without saving anything |
| `POST /api/reports` | `photo` + `lng` + `lat` (+ `intent`, `hazardId`, `dangerLevel`, `reporterName`) → the saved report |
| `GET /api/reports` | Every report, newest first |
| `GET /uploads/<file>` | The stored photos |

```bash
curl -X POST localhost:3000/api/reports \
  -F "photo=@hazard.jpg" -F "lng=150.8955" -F "lat=-34.4241"
```

## How a report becomes a hazard

`POST /api/reports` writes the photo to disk **before** calling the model, so a
model outage never costs a rider the photo they stopped in the road to take.
Then:

1. An explicit `hazardId` attaches the report to that hazard — this is the
   "report as fixed" path.
2. Otherwise the nearest active hazard within **40m** claims it, so two riders
   photographing one pothole produce one pin rather than two.
3. Failing that, a new hazard is opened from whatever the model saw.

A rider's own `dangerLevel` overrides the model's on the saved report. Nothing
here retires a hazard: a fix report only makes the pin read as unconfirmed, and
`status: 'fixed'` stays a deliberate act.

## About that confidence number

The model reports its own confidence, and it is **not calibrated** — it is the
model's self-assessment, not a measured accuracy. It is stored and displayed as
a hint to the rider, labelled as such in the UI. Don't build routing weights on
it.

## Things worth knowing before you change anything

**Structured Outputs, not prompt-and-hope.** `AiService` pins a strict
`json_schema` with the hazard kinds and danger levels as enums, so the model
cannot return a kind the app has no label for. Anything unexpected still gets
coerced on the way out.

**`analyze()` never throws.** A 401, a timeout, a refusal — all degrade to a
labelled fallback. Losing a report to a model outage would be the worst
possible failure mode for this app.

**`synchronize: true` owns the schema.** Fine while this is a draft; swap it
for migrations before it holds anything anyone would miss.

**The seed only runs on an empty database.** Six fixture hazards, so a fresh
clone has a map worth looking at. It never touches real rows.

## Tests

```bash
npm test          # 11 tests
npm run typecheck
```

One of them makes a real request with a deliberately invalid key, to prove the
failure path degrades instead of throwing. It needs no valid key and costs
nothing.
