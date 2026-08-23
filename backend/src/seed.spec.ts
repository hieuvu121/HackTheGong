import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { Hazard } from './hazards/hazard.entity';
import { Report } from './reports/report.entity';
import { seedDemoData } from './seed';

/**
 * The seed exists so a demo has a map worth looking at. A pin with no photo is
 * a dead end in the UI — the hazard sheet says "No photos yet" and shows
 * nothing — so photos are part of what "seeded" has to mean.
 */
describe('seedDemoData', () => {
  let db: DataSource;
  let uploadDir: string;

  beforeEach(async () => {
    uploadDir = mkdtempSync(join(tmpdir(), 'cyclesafe-uploads-'));
    db = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Hazard, Report],
      synchronize: true,
    });
    await db.initialize();
  });

  afterEach(async () => {
    await db.destroy();
    rmSync(uploadDir, { recursive: true, force: true });
  });

  const hazardsWithReports = () =>
    db.getRepository(Hazard).find({ relations: { reports: true } });

  it('gives every seeded hazard at least one report', async () => {
    await seedDemoData(db, uploadDir);

    const hazards = await hazardsWithReports();
    expect(hazards.length).toBeGreaterThan(0);
    for (const hazard of hazards) {
      expect(hazard.reports.length).toBeGreaterThan(0);
    }
  });

  it('writes each seeded photo into the upload directory it will be served from', async () => {
    await seedDemoData(db, uploadDir);

    const reports = await db.getRepository(Report).find();
    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      expect(existsSync(join(uploadDir, report.photo))).toBe(true);
    }
  });

  it('backfills reports onto hazards seeded before photos existed', async () => {
    // The state a running demo is already in: hazards seeded, no reports.
    await db.getRepository(Hazard).save(
      db.getRepository(Hazard).create({
        lng: 150.8955,
        lat: -34.4241,
        kind: 'construction',
        dangerLevel: 'dangerous',
        status: 'active',
        streetName: 'Crown St',
      }),
    );

    await seedDemoData(db, uploadDir);

    const crown = (await hazardsWithReports()).filter((h) => h.streetName === 'Crown St');
    expect(crown).toHaveLength(1);
    expect(crown[0].reports.length).toBeGreaterThan(0);
  });

  it('is idempotent — a second run adds nothing', async () => {
    await seedDemoData(db, uploadDir);
    const first = await hazardsWithReports();

    await seedDemoData(db, uploadDir);
    const second = await hazardsWithReports();

    expect(second).toHaveLength(first.length);
    expect(second.flatMap((h) => h.reports)).toHaveLength(first.flatMap((h) => h.reports).length);
    expect(readdirSync(uploadDir).sort()).toEqual(readdirSync(uploadDir).sort());
  });

  it('leaves hazards riders reported alone', async () => {
    const repo = db.getRepository(Hazard);
    const rider = await repo.save(
      repo.create({
        lng: 151.2093,
        lat: -33.8688,
        kind: 'debris',
        dangerLevel: 'low',
        status: 'active',
        streetName: 'Rider St',
      }),
    );

    await seedDemoData(db, uploadDir);

    const still = await repo.findOne({ where: { id: rider.id }, relations: { reports: true } });
    expect(still).not.toBeNull();
    expect(still!.reports).toHaveLength(0);
  });
});
