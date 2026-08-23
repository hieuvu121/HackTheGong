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
    save: jest.fn((h) => Promise.resolve(h)),
    setStatus: jest.fn().mockResolvedValue(undefined),
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

describe('retiring a hazard riders say is fixed', () => {
  const fixPhoto = { ...photo };

  /**
   * Two reports, not one. A hazard removed on a single photo is a hazard one
   * person can remove for everyone; the first fix marks it unconfirmed — still
   * routed around, but reading as "might be done" — and the second retires it.
   */
  function buildWith(existing: Partial<Report>[]) {
    const base = build();
    const hazard = { id: 'hz-1', status: 'active', reports: existing } as unknown as Hazard;
    (base.hazards.findOne as jest.Mock).mockResolvedValue(hazard);
    return { ...base, hazard };
  }

  const fix = (): Partial<Report> => ({ intent: 'fix' });
  const sighting = (): Partial<Report> => ({ intent: 'report' });
  const submitFix = (service: ReportsService) =>
    service.create({ ...at, hazardId: 'hz-1', intent: 'fix' }, fixPhoto);

  it('leaves the hazard active on the first fix, so it still routes', async () => {
    const { service, hazards, hazard } = buildWith([sighting()]);
    await submitFix(service);
    expect(hazard.status).toBe('active');
    expect(hazards.setStatus).not.toHaveBeenCalled();
  });

  it('retires it once a second rider confirms', async () => {
    const { service, hazards, hazard } = buildWith([sighting(), fix()]);
    await submitFix(service);
    expect(hazard.status).toBe('fixed');
    expect(hazards.setStatus).toHaveBeenCalledWith('hz-1', 'fixed');
  });

  it('starts the count over when someone reports it is still there', async () => {
    // fix, then a fresh sighting — the run is broken, so this fix is the first
    // again and the hazard stays up.
    const { service, hazard } = buildWith([fix(), sighting()]);
    await submitFix(service);
    expect(hazard.status).toBe('active');
  });

  it('counts only the trailing run, however long the history', async () => {
    const { service, hazard } = buildWith([fix(), fix(), sighting(), fix()]);
    await submitFix(service);
    expect(hazard.status).toBe('fixed');
  });

  it('never retires on a plain sighting, whatever came before', async () => {
    const { service, hazard } = buildWith([fix(), fix()]);
    await service.create({ ...at, hazardId: 'hz-1', intent: 'report' }, fixPhoto);
    expect(hazard.status).toBe('active');
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

describe('a fix report is not a hazard report', () => {
  const fixDto = {
    ...at,
    hazardId: 'hz-1',
    intent: 'fix' as const,
    caption: 'Resurfaced, lane clear.',
    fixed: true,
    confidence: 0.93,
    verdictSource: 'openai' as const,
  };

  function buildOnHazard() {
    const base = build();
    (base.hazards.findOne as jest.Mock).mockResolvedValue({
      id: 'hz-1',
      status: 'active',
      kind: 'pothole',
      dangerLevel: 'dangerous',
      reports: [],
    } as unknown as Hazard);
    return base;
  }

  it('never re-classifies the photo as a hazard', async () => {
    // The bug: a photo of fresh tarmac went through the hazard prompt and came
    // back "construction", so proof a pothole was gone read as a new hazard.
    const { service, analyze } = buildOnHazard();
    await service.create(fixDto, photo);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('records what the model said about the repair', async () => {
    const { service, saved } = buildOnHazard();
    await service.create(fixDto, photo);
    expect(saved[0].aiFixed).toBe(true);
    expect(saved[0].aiCaption).toBe('Resurfaced, lane clear.');
    expect(saved[0].aiConfidence).toBeCloseTo(0.93);
  });

  it('inherits the hazard’s own kind and rating, rather than inventing one', async () => {
    const { service, saved } = buildOnHazard();
    await service.create(fixDto, photo);
    expect(saved[0].aiKind).toBe('pothole');
    expect(saved[0].aiDangerLevel).toBe('dangerous');
  });

  it('files the fix even when the model disagreed', async () => {
    // The rider stood there and the model did not. Their submission stands.
    const { service, saved } = buildOnHazard();
    await service.create({ ...fixDto, fixed: false }, photo);
    expect(saved[0].aiFixed).toBe(false);
    expect(saved[0].intent).toBe('fix');
  });

  it('leaves the verdict unset when nothing judged the photo', async () => {
    const { service, saved } = buildOnHazard();
    await service.create({ ...fixDto, fixed: undefined }, photo);
    expect(saved[0].aiFixed).toBeNull();
  });

  it('leaves aiFixed unset on an ordinary hazard report', async () => {
    const { service, saved } = build();
    await service.create({ ...at }, photo);
    expect(saved[0].aiFixed).toBeNull();
  });
});
