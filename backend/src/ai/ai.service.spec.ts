import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

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
