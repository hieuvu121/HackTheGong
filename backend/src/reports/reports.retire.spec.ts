import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';
import { Report } from './report.entity';
import { Hazard } from '../hazards/hazard.entity';
import { HazardsService } from '../hazards/hazards.service';
import { AiService } from '../ai/ai.service';
import { PhotoStorageService } from './photo-storage.service';

/**
 * The retire path against a real database.
 *
 * The mocked unit tests cannot see this: saving a hazard whose `reports`
 * relation was loaded before the new report was inserted made TypeORM treat
 * that report as removed from the relation and null its foreign key —
 * "NOT NULL constraint failed: reports.hazardId", a 500 after the report had
 * already been written. Only a real repository shows it.
 */
describe('retiring a hazard, against a real database', () => {
  let db: DataSource;
  let service: ReportsService;
  let hazards: HazardsService;
  let hazardId: string;

  const photo = { buffer: Buffer.from('jpeg'), mimetype: 'image/jpeg' };
  const at = { lng: 150.8931, lat: -34.4278 };

  beforeEach(async () => {
    db = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Hazard, Report],
      synchronize: true,
    });
    await db.initialize();

    hazards = new HazardsService(db.getRepository(Hazard));
    service = new ReportsService(
      db.getRepository(Report),
      hazards,
      {
        analyze: jest.fn().mockResolvedValue({
          kind: 'pothole',
          dangerLevel: 'moderate',
          confidence: 0.5,
          caption: 'A hole.',
          clearsInDays: 30,
          source: 'openai',
        }),
      } as unknown as AiService,
      { save: jest.fn().mockResolvedValue('stored.jpg') } as unknown as PhotoStorageService,
    );

    const hazard = await hazards.createFromVerdict(
      at,
      { kind: 'pothole', dangerLevel: 'moderate', confidence: 0.5, caption: 'A hole.', clearsInDays: 30, source: 'openai' },
      'Keira St',
    );
    hazardId = hazard.id;
    await service.create({ ...at, hazardId, intent: 'report' }, photo);
  });

  afterEach(() => db.destroy());

  const submitFix = () =>
    service.create(
      { ...at, hazardId, intent: 'fix', kind: 'pothole', caption: 'Patched.' },
      photo,
    );

  const statusOf = async () => (await hazards.findOne(hazardId))!.status;

  it('accepts the first fix without erroring, and leaves the hazard up', async () => {
    await expect(submitFix()).resolves.toBeDefined();
    expect(await statusOf()).toBe('active');
  });

  it('retires the hazard on the second fix', async () => {
    await submitFix();
    await submitFix();
    expect(await statusOf()).toBe('fixed');
  });

  it('keeps every report attached — retiring must not orphan the evidence', async () => {
    await submitFix();
    await submitFix();

    const kept = await db.getRepository(Report).find();
    expect(kept).toHaveLength(3);
    expect(kept.every((r) => r.hazardId === hazardId)).toBe(true);
  });
});
