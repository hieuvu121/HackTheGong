import { mightBeFixed, FALLBACK_CLEAR_DAYS } from '../staleness';
import { Hazard, HazardKind } from '../../data/types';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const hazard = (over: Partial<Hazard> & { kind: HazardKind }, lastReportDaysAgo = 40): Hazard =>
  ({
    id: 'hz-1',
    coord: { lng: 150.89, lat: -34.43 },
    dangerLevel: 'moderate',
    status: 'active',
    streetName: 'Crown St',
    expectedClearDays: null,
    reports: [
      {
        id: 'rp-1',
        hazardId: 'hz-1',
        photo: 'p.jpg',
        reportedAt: daysAgo(lastReportDaysAgo),
        reporterName: 'Mia',
        intent: 'report',
        ai: { kind: over.kind, dangerLevel: 'moderate', confidence: 0.8, caption: 'x' },
      },
    ],
    ...over,
  }) as Hazard;

const now = new Date();

describe('mightBeFixed', () => {
  it('flags a pothole nobody has confirmed for longer than it takes to patch', () => {
    const note = mightBeFixed(hazard({ kind: 'pothole' }, 40), now);
    expect(note).not.toBeNull();
    expect(note!.daysSince).toBe(40);
    expect(note!.clearDays).toBe(FALLBACK_CLEAR_DAYS.pothole);
  });

  it('says nothing while the hazard is younger than the estimate', () => {
    expect(mightBeFixed(hazard({ kind: 'pothole' }, 10), now)).toBeNull();
  });

  /**
   * Only the two kinds that are waiting on a repair. Telling a rider an unlit
   * road "may already be fixed" is a lie they could get hurt believing.
   */
  it('never flags a kind that does not simply get repaired', () => {
    for (const kind of ['unlit', 'highway', 'debris', 'no_bike_lane'] as HazardKind[]) {
      expect(mightBeFixed(hazard({ kind }, 999), now)).toBeNull();
    }
  });

  it('flags long-running construction, on its own longer clock', () => {
    expect(mightBeFixed(hazard({ kind: 'construction' }, 40), now)).toBeNull();
    expect(mightBeFixed(hazard({ kind: 'construction' }, 120), now)).not.toBeNull();
  });

  it('prefers the model’s estimate for this hazard over the constant', () => {
    const note = mightBeFixed(hazard({ kind: 'pothole', expectedClearDays: 5 }, 10), now);
    expect(note).not.toBeNull();
    expect(note!.clearDays).toBe(5);
  });

  it('counts from the most recent report, not the oldest', () => {
    const h = hazard({ kind: 'pothole' }, 90);
    h.reports.push({ ...h.reports[0], id: 'rp-2', reportedAt: daysAgo(2) });
    expect(mightBeFixed(h, now)).toBeNull();
  });

  it('says nothing about a hazard already retired', () => {
    expect(mightBeFixed(hazard({ kind: 'pothole', status: 'fixed' }, 99), now)).toBeNull();
  });

  it('says nothing when there is no report to date it from', () => {
    expect(mightBeFixed(hazard({ kind: 'pothole', reports: [] }, 99), now)).toBeNull();
  });
});
