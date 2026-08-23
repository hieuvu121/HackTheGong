import { Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './create-report.dto';
import { Report } from './report.entity';
import { Hazard } from '../hazards/hazard.entity';
import { HazardsService } from '../hazards/hazards.service';
import { AiService } from '../ai/ai.service';
import { PhotoStorageService } from './photo-storage.service';
import { Verdict } from '../ai/verdict';

const MODEL_VERDICT: Verdict = {
  kind: 'construction',
  dangerLevel: 'moderate',
  confidence: 0.4,
  caption: 'Something is blocking the lane.',
  clearsInDays: 45,
  source: 'openai',
};

const photo = { buffer: Buffer.from('jpeg'), mimetype: 'image/jpeg' };

function build() {
  const analyze = jest.fn().mockResolvedValue(MODEL_VERDICT);
  const saved: Report[] = [];

  const reports = {
    create: (r: Partial<Report>) => r as Report,
    save: (r: Report) => {
      saved.push(r);
      return Promise.resolve(r);
    },
  } as unknown as Repository<Report>;

  const hazards = {
    findOne: jest.fn().mockResolvedValue(null),
    findNearestActive: jest.fn().mockResolvedValue(null),
    createFromVerdict: jest
      .fn()
      .mockImplementation((at, verdict: Verdict) =>
        Promise.resolve({ id: 'hz-new', kind: verdict.kind } as Hazard),
      ),
  } as unknown as HazardsService;

  const service = new ReportsService(
    reports,
    hazards,
    { analyze } as unknown as AiService,
    { save: jest.fn().mockResolvedValue('stored.jpg') } as unknown as PhotoStorageService,
  );

  return { service, analyze, hazards, saved };
}

const at = { lng: 150.8931, lat: -34.4278 };

describe('ReportsService.create with a verdict the rider already approved', () => {
  const approved: CreateReportDto = {
    ...at,
    kind: 'pothole',
    caption: 'Deep pothole right where the bike lane narrows.',
    dangerLevel: 'dangerous',
    confidence: 0.4,
    verdictSource: 'rider',
  };

  it('does not analyse the photo a second time', async () => {
    const { service, analyze } = build();
    await service.create(approved, photo);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('saves the rider’s wording, not the model’s', async () => {
    const { service, saved } = build();
    await service.create(approved, photo);
    expect(saved[0].aiCaption).toBe('Deep pothole right where the bike lane narrows.');
  });

  it('saves the rider’s hazard kind and rating', async () => {
    const { service, saved } = build();
    await service.create(approved, photo);
    expect(saved[0].aiKind).toBe('pothole');
    expect(saved[0].aiDangerLevel).toBe('dangerous');
  });

  it('records that a rider wrote it, so it is never shown as the model’s', async () => {
    const { service, saved } = build();
    await service.create(approved, photo);
    expect(saved[0].aiSource).toBe('rider');
  });

  it('opens the new pin with the kind the rider corrected it to', async () => {
    const { service, hazards } = build();
    await service.create(approved, photo);
    expect(hazards.createFromVerdict).toHaveBeenCalledWith(
      at,
      expect.objectContaining({ kind: 'pothole' }),
      undefined,
    );
  });
});

describe('ReportsService.create without a verdict', () => {
  // Any caller that is not our own app — curl, a future integration — still
  // gets the photo classified for them.
  it('falls back to analysing the photo itself', async () => {
    const { service, analyze, saved } = build();
    await service.create({ ...at }, photo);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(saved[0].aiCaption).toBe(MODEL_VERDICT.caption);
    expect(saved[0].aiSource).toBe('openai');
  });

  it('still honours a lone danger override', async () => {
    const { service, saved } = build();
    await service.create({ ...at, dangerLevel: 'low' }, photo);
    expect(saved[0].aiDangerLevel).toBe('low');
    expect(saved[0].aiKind).toBe(MODEL_VERDICT.kind);
  });
});

describe('the clear-time estimate on a submitted verdict', () => {
  it('keeps the estimate the rider’s screen showed', async () => {
    const { service, hazards } = build();
    await service.create(
      { ...at, kind: 'pothole', caption: 'A hole.', clearsInDays: 21 },
      photo,
    );
    expect(hazards.createFromVerdict).toHaveBeenCalledWith(
      at,
      expect.objectContaining({ clearsInDays: 21 }),
      undefined,
    );
  });

  it('falls back to the per-kind constant when no model supplied one', async () => {
    const { service, hazards } = build();
    await service.create({ ...at, kind: 'construction', caption: 'Works.' }, photo);
    expect(hazards.createFromVerdict).toHaveBeenCalledWith(
      at,
      expect.objectContaining({ clearsInDays: 90 }),
      undefined,
    );
  });

  it('leaves it unset for a kind that does not simply get repaired', async () => {
    const { service, hazards } = build();
    await service.create({ ...at, kind: 'unlit', caption: 'No lights.' }, photo);
    expect(hazards.createFromVerdict).toHaveBeenCalledWith(
      at,
      expect.objectContaining({ clearsInDays: null }),
      undefined,
    );
  });
});
