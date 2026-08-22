import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Hazard } from './hazards/hazard.entity';

/**
 * The fixtures the UI draft was built against, so a fresh database still has a
 * map worth looking at. Only runs when the table is empty — it never touches
 * real reports.
 */
const SEED: Partial<Hazard>[] = [
  {
    lng: 150.8955,
    lat: -34.4241,
    kind: 'construction',
    dangerLevel: 'dangerous',
    status: 'active',
    streetName: 'Crown St',
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
  },
  {
    lng: 150.9012,
    lat: -34.4265,
    kind: 'pothole',
    dangerLevel: 'moderate',
    status: 'active',
    streetName: 'Keira St',
  },
  {
    lng: 150.8848,
    lat: -34.4198,
    kind: 'highway',
    dangerLevel: 'dangerous',
    status: 'active',
    streetName: 'Princes Hwy',
  },
  {
    lng: 150.8969,
    lat: -34.4331,
    kind: 'debris',
    dangerLevel: 'low',
    status: 'active',
    streetName: 'Bank St',
  },
  {
    lng: 150.8921,
    lat: -34.4224,
    kind: 'pothole',
    dangerLevel: 'moderate',
    status: 'fixed',
    streetName: 'Smith St',
  },
];

export async function seedIfEmpty(dataSource: DataSource): Promise<void> {
  const log = new Logger('Seed');
  const repo = dataSource.getRepository(Hazard);

  if ((await repo.count()) > 0) return;

  await repo.save(SEED.map((h) => repo.create(h)));
  log.log(`Seeded ${SEED.length} hazards into an empty database.`);
}
