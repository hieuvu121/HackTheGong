import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { fallbackClearDays, fixPrompt } from './verdict';

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

describe('assessing whether a hazard has been fixed', () => {
  const context = { kind: 'pothole' as const, caption: 'Deep pothole in the bike lane.' };

  /**
   * The prompt is hard-wrapped for readability, so a phrase can straddle a line
   * break. Assert on the wording, not on where it happens to wrap today.
   */
  const wording = (c: typeof context) => fixPrompt(c).replace(/\s+/g, ' ');

  it('asks a different question than hazard classification', () => {
    // The bug this exists for: a fix photo went through the hazard prompt and
    // came back classified as a hazard, so a photo of freshly laid tarmac was
    // reported as construction.
    expect(fixPrompt(context)).toMatch(/repair|fixed|cleared/i);
    expect(fixPrompt(context)).toContain('Deep pothole in the bike lane.');
  });

  it('tells the model what it is comparing against', () => {
    expect(fixPrompt({ kind: 'debris', caption: 'Branch across the path.' })).toContain(
      'Branch across the path.',
    );
  });

  it('still frames the question when the hazard has no description yet', () => {
    const prompt = fixPrompt({ kind: 'pothole', caption: '' });
    expect(prompt).toMatch(/pothole/i);
    expect(prompt.length).toBeGreaterThan(0);
  });

  /**
   * A rider photographed a clear street and was told it still looked like an
   * active hazard, because the shot did not match the original framing. The
   * rider was standing there; only a hazard visible in the photo, or a photo
   * that is not of a road, should overrule them.
   */
  it('accepts an ordinary road rather than demanding proof of the repair', () => {
    const prompt = wording(context);
    expect(prompt).toMatch(/fixed: true for any ordinary, usable road or path/i);
    expect(prompt).toMatch(/does not have to match the original photo/i);
    expect(prompt).toMatch(/fixed: false only when/i);
  });

  it('names the conditions that still count as a hazard', () => {
    const prompt = wording(context);
    for (const condition of [
      /not a road or path at all/i,
      /barriers across the route/i,
      /debris or a fallen branch/i,
      /dark and unlit/i,
    ]) {
      expect(prompt).toMatch(condition);
    }
  });

  /**
   * A photo of two cyclists riding a clear waterfront street came back "still
   * looks like a hazard", 91% confident, because roadwork cones were stacked on
   * the far verge. What blocks a rider is what counts, not what is in frame.
   */
  it('asks about the riding line rather than the whole frame', () => {
    const prompt = wording(context);
    expect(prompt).toMatch(/not the whole picture/i);
    expect(prompt).toMatch(/set off to the side/i);
    expect(prompt).toMatch(/cycling or walking through unobstructed/i);
  });

  describe('with no model available', () => {
    const service = new AiService(configWith(null));

    /**
     * Null, not false. "Not fixed" is a claim, and nothing looked at the photo
     * — reporting it would warn a rider off a submission on no evidence.
     */
    it('leaves the verdict unset rather than claiming the hazard is not fixed', async () => {
      const verdict = await service.assessFix(Buffer.from('x'), 'image/jpeg', context);
      expect(verdict.fixed).toBeNull();
      expect(verdict.source).toBe('fallback');
    });

    it('gives it zero confidence, because nothing judged it', async () => {
      const verdict = await service.assessFix(Buffer.from('x'), 'image/jpeg', context);
      expect(verdict.confidence).toBe(0);
    });

    it('never throws — a rider must not lose a fix to an outage', async () => {
      await expect(
        service.assessFix(Buffer.from('x'), 'image/jpeg', context),
      ).resolves.toBeDefined();
    });
  });
});
