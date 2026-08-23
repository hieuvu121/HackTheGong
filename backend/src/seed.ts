import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DangerLevel, Hazard, HazardKind } from './hazards/hazard.entity';
import { Report, ReportIntent } from './reports/report.entity';
import { haversineMeters, MERGE_RADIUS_M } from './hazards/hazards.service';

/** Bundled demo photographs, copied into the upload dir so /uploads serves them. */
const PHOTO_DIR = resolve(__dirname, '../assets/hazards');

interface SeedReport {
  photo: string;
  reporterName: string;
  intent: ReportIntent;
  /** How long ago it was filed; the sheet shows "last updated Nd ago". */
  daysAgo: number;
  kind: HazardKind;
  dangerLevel: DangerLevel;
  confidence: number;
  caption: string;
}

interface SeedHazard {
  lng: number;
  lat: number;
  kind: HazardKind;
  dangerLevel: DangerLevel;
  status: 'active' | 'fixed';
  streetName: string;
  activeWindowStart?: number;
  activeWindowEnd?: number;
  reports: SeedReport[];
}

/**
 * The fixtures the UI draft was built against, so a fresh database still has a
 * map worth looking at.
 *
 * Reports are part of the seed, not an afterthought. Seeding bare hazards left
 * every demo pin opening a sheet that said "No photos yet" — the app looked
 * broken precisely because the API was working, since the offline fixtures it
 * replaced did carry photos.
 */
const SEED: SeedHazard[] = [
  {
    lng: 150.8955,
    lat: -34.4241,
    kind: 'construction',
    dangerLevel: 'dangerous',
    status: 'active',
    streetName: 'Crown St',
    reports: [
      {
        photo: 'construction.jpg',
        reporterName: 'Mia',
        intent: 'report',
        daysAgo: 9,
        kind: 'construction',
        dangerLevel: 'dangerous',
        confidence: 0.94,
        caption: 'Footpath closed, cyclists forced into the traffic lane.',
      },
      {
        photo: 'construction.jpg',
        reporterName: 'Dan',
        intent: 'report',
        daysAgo: 4,
        kind: 'construction',
        dangerLevel: 'dangerous',
        confidence: 0.89,
        caption: 'Barriers still in place, no marked detour for bikes.',
      },
    ],
  },
  {
    lng: 150.8887,
    lat: -34.4302,
    kind: 'unlit',
    dangerLevel: 'moderate',
    status: 'active',
    streetName: 'Cliff Rd',
    activeWindowStart: 19 * 60,
    activeWindowEnd: 6 * 60,
    reports: [
      {
        photo: 'unlit.jpg',
        reporterName: 'Priya',
        intent: 'report',
        daysAgo: 12,
        kind: 'unlit',
        dangerLevel: 'moderate',
        confidence: 0.71,
        caption: 'No street lighting along this stretch after dark.',
      },
    ],
  },
  {
    lng: 150.9012,
    lat: -34.4265,
    kind: 'pothole',
    dangerLevel: 'moderate',
    status: 'active',
    streetName: 'Keira St',
    reports: [
      {
        photo: 'pothole.jpg',
        reporterName: 'Sam',
        intent: 'report',
        daysAgo: 6,
        kind: 'pothole',
        dangerLevel: 'moderate',
        confidence: 0.83,
        caption: 'Deep pothole in the bike lane, roughly 30cm across.',
      },
      {
        photo: 'pothole.jpg',
        reporterName: 'Tom',
        intent: 'fix',
        daysAgo: 2,
        kind: 'pothole',
        dangerLevel: 'low',
        confidence: 0.58,
        caption: 'Looks patched, though the seam is still rough.',
      },
    ],
  },
  {
    lng: 150.8848,
    lat: -34.4198,
    kind: 'highway',
    dangerLevel: 'dangerous',
    status: 'active',
    streetName: 'Princes Hwy',
    reports: [
      {
        photo: 'unlit.jpg',
        reporterName: 'Josh',
        intent: 'report',
        daysAgo: 14,
        kind: 'highway',
        dangerLevel: 'dangerous',
        confidence: 0.96,
        caption: 'High-speed traffic with no shoulder or separated path.',
      },
    ],
  },
  {
    lng: 150.8969,
    lat: -34.4331,
    kind: 'debris',
    dangerLevel: 'low',
    status: 'active',
    streetName: 'Bank St',
    reports: [
      {
        photo: 'debris.jpg',
        reporterName: 'Ella',
        intent: 'report',
        daysAgo: 3,
        kind: 'debris',
        dangerLevel: 'low',
        confidence: 0.62,
        caption: 'Scattered branches at the path edge, passable with care.',
      },
    ],
  },
  {
    lng: 150.8921,
    lat: -34.4224,
    kind: 'pothole',
    dangerLevel: 'moderate',
    status: 'fixed',
    streetName: 'Smith St',
    reports: [
      {
        photo: 'pothole.jpg',
        reporterName: 'Ari',
        intent: 'report',
        daysAgo: 26,
        kind: 'pothole',
        dangerLevel: 'moderate',
        confidence: 0.78,
        caption: 'Broken surface across the bike lane.',
      },
      {
        photo: 'pothole.jpg',
        reporterName: 'Nina',
        intent: 'fix',
        daysAgo: 5,
        kind: 'pothole',
        dangerLevel: 'low',
        confidence: 0.91,
        caption: 'Surface resealed, lane clear. Hazard appears resolved.',
      },
    ],
  },
];

/** Stable names, so a re-run overwrites its own file instead of piling up copies. */
const seedPhotoName = (file: string) => `seed-${file}`;

function copyPhotos(uploadDir: string): void {
  mkdirSync(uploadDir, { recursive: true });

  const wanted = new Set(SEED.flatMap((h) => h.reports.map((r) => r.photo)));
  for (const file of wanted) {
    const target = join(uploadDir, seedPhotoName(file));
    if (existsSync(target)) continue;
    copyFileSync(join(PHOTO_DIR, file), target);
  }
}

/**
 * Match by position, not id.
 *
 * Ids are generated, so a database seeded by an earlier build has different
 * ones and nothing to match on but where the hazard is. The merge radius is
 * the same rule reports already use to decide two photos are one pothole.
 */
function findSeeded(existing: Hazard[], seed: SeedHazard): Hazard | undefined {
  return existing.find(
    (h) => h.kind === seed.kind && haversineMeters(h, seed) <= MERGE_RADIUS_M,
  );
}

/**
 * Put the demo hazards, and their photos, in place.
 *
 * Idempotent by design rather than guarded by an "is the table empty" check:
 * the databases that most need fixing are the ones already holding hazards
 * seeded before photos existed. Anything a rider actually reported is left
 * untouched.
 */
export async function seedDemoData(dataSource: DataSource, uploadDir: string): Promise<void> {
  const log = new Logger('Seed');
  const hazards = dataSource.getRepository(Hazard);
  const reports = dataSource.getRepository(Report);

  copyPhotos(uploadDir);

  const existing = await hazards.find({ relations: { reports: true } });
  let created = 0;
  let backfilled = 0;

  for (const seed of SEED) {
    let hazard = findSeeded(existing, seed);

    if (!hazard) {
      hazard = await hazards.save(
        hazards.create({
          lng: seed.lng,
          lat: seed.lat,
          kind: seed.kind,
          dangerLevel: seed.dangerLevel,
          status: seed.status,
          streetName: seed.streetName,
          activeWindowStart: seed.activeWindowStart ?? null,
          activeWindowEnd: seed.activeWindowEnd ?? null,
        }),
      );
      hazard.reports = [];
      created += 1;
    }

    // Only ever adds photos to a pin that has none — never duplicates a
    // rider's own report, and never re-adds its own on a second run.
    if (hazard.reports.length > 0) continue;

    for (const seedReport of seed.reports) {
      const saved = await reports.save(
        reports.create({
          hazardId: hazard.id,
          photo: seedPhotoName(seedReport.photo),
          reporterName: seedReport.reporterName,
          intent: seedReport.intent,
          lng: seed.lng,
          lat: seed.lat,
          aiKind: seedReport.kind,
          aiDangerLevel: seedReport.dangerLevel,
          aiConfidence: seedReport.confidence,
          aiCaption: seedReport.caption,
          aiSource: 'fallback',
        }),
      );

      // createdAt is generated on insert, so the backdating that makes "last
      // updated 9d ago" mean anything has to be written afterwards.
      const reportedAt = new Date(Date.now() - seedReport.daysAgo * 86_400_000);
      await reports.update(saved.id, { createdAt: reportedAt });
    }
    backfilled += 1;
  }

  if (created || backfilled) {
    log.log(`Seeded ${created} hazards and photographed ${backfilled} of them.`);
  }
}
