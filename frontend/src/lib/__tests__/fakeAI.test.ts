import { analyzeReportPhoto, analyzeFixPhoto } from '../fakeAI';

jest.useFakeTimers();

const resolve = async <T>(p: Promise<T>): Promise<T> => {
  jest.runAllTimers();
  return p;
};

describe('analyzeReportPhoto', () => {
  it('returns a verdict with a confidence between 0 and 1', async () => {
    const v = await resolve(analyzeReportPhoto(0));
    expect(v.confidence).toBeGreaterThan(0);
    expect(v.confidence).toBeLessThanOrEqual(1);
  });

  it('returns one of the three danger tiers', async () => {
    const v = await resolve(analyzeReportPhoto(1));
    expect(['dangerous', 'moderate', 'low']).toContain(v.dangerLevel);
  });

  it('is deterministic for a given seed', async () => {
    const a = await resolve(analyzeReportPhoto(2));
    const b = await resolve(analyzeReportPhoto(2));
    expect(a).toEqual(b);
  });

  it('gives a non-empty caption', async () => {
    const v = await resolve(analyzeReportPhoto(0));
    expect(v.caption.length).toBeGreaterThan(10);
  });
});

describe('analyzeFixPhoto', () => {
  it('downgrades the hazard to low and keeps the kind', async () => {
    const v = await resolve(analyzeFixPhoto('pothole'));
    expect(v.kind).toBe('pothole');
    expect(v.dangerLevel).toBe('low');
    expect(v.confidence).toBeGreaterThan(0.8);
  });
});
