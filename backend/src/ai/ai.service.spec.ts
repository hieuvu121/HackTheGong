import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { fallbackClearDays } from './verdict';

const configWith = (key: string | null) =>
  ({
    get: (name: string) => (name === 'openaiApiKey' ? key : 'gpt-5.6'),
  }) as unknown as ConfigService;

describe('AiService without a key', () => {
  const service = new AiService(configWith(null));

  it('reports itself disabled rather than pretending', () => {
    expect(service.enabled).toBe(false);
  });

  it('returns a verdict labelled as a fallback', async () => {
    const verdict = await service.analyze(Buffer.from('not-really-an-image'), 'image/jpeg');
    expect(verdict.source).toBe('fallback');
  });

  it('gives a fallback zero confidence, because nothing looked at the photo', async () => {
    const verdict = await service.analyze(Buffer.from('x'), 'image/jpeg');
    expect(verdict.confidence).toBe(0);
  });

  it('still returns a usable kind and level so the rider can correct it', async () => {
    const verdict = await service.analyze(Buffer.from('x'), 'image/jpeg');
    expect(['construction', 'unlit', 'pothole', 'highway', 'debris', 'no_bike_lane']).toContain(
      verdict.kind,
    );
    expect(['dangerous', 'moderate', 'low']).toContain(verdict.dangerLevel);
  });
});

describe('AiService with a key', () => {
  it('reports itself enabled', () => {
    expect(new AiService(configWith('sk-test-not-a-real-key')).enabled).toBe(true);
  });

  it('degrades to a fallback when the call fails, never throwing', async () => {
    // The key is fake, so the request fails — a rider must not lose a report
    // to a model outage.
    const service = new AiService(configWith('sk-test-not-a-real-key'));
    const verdict = await service.analyze(Buffer.from('x'), 'image/jpeg');
    expect(verdict.source).toBe('fallback');
  }, 30_000);
});

describe('expected clear time', () => {
  const service = new AiService(configWith(null));

  /**
   * Only two kinds get an estimate. A pothole is patched and construction ends;
   * an unlit road or a highway with no shoulder is not "maintenance pending",
   * and telling a rider it might have cleared itself would be a lie.
   */
  it('offers a fallback estimate for potholes and construction', () => {
    expect(fallbackClearDays('pothole')).toBeGreaterThan(0);
    expect(fallbackClearDays('construction')).toBeGreaterThan(0);
  });

  it('offers none for hazards that do not simply get repaired', () => {
    expect(fallbackClearDays('unlit')).toBeNull();
    expect(fallbackClearDays('highway')).toBeNull();
    expect(fallbackClearDays('debris')).toBeNull();
    expect(fallbackClearDays('no_bike_lane')).toBeNull();
  });

  it('expects construction to outlast a pothole', () => {
    expect(fallbackClearDays('construction')!).toBeGreaterThan(fallbackClearDays('pothole')!);
  });

  it('leaves the estimate unset on a fallback verdict, rather than guessing', async () => {
    // Nothing looked at the photo, so there is nothing to estimate from. The
    // per-kind constant is applied later, by whoever reads the hazard.
    const verdict = await service.analyze(Buffer.from('x'), 'image/jpeg');
    expect(verdict.clearsInDays).toBeNull();
  });
});
