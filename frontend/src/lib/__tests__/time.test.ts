import { minutesOfDay, isWithinWindow, isHazardActiveAt, formatDepartureLabel } from '../time';
import { Hazard } from '../../data/types';

const at = (h: number, m = 0) => new Date(2026, 7, 22, h, m);

// A real position, because for an unlit road the coordinate now decides the
// answer — darkness is worked out from the sun there, not read from the stored
// window below, which is left in place to prove the sun wins.
const unlit: Hazard = {
  id: 'u',
  coord: { lng: 150.8931, lat: -34.4278 },
  kind: 'unlit',
  dangerLevel: 'moderate',
  status: 'active',
  streetName: 'X',
  reports: [],
  activeWindow: { startMin: 19 * 60, endMin: 6 * 60 },
};

const pothole: Hazard = {
  id: 'p',
  coord: { lng: 0, lat: 0 },
  kind: 'pothole',
  dangerLevel: 'moderate',
  status: 'active',
  streetName: 'Y',
  reports: [],
};

const fixed: Hazard = { ...pothole, id: 'f', status: 'fixed' };

describe('minutesOfDay', () => {
  it('converts a time to minutes past midnight', () => {
    expect(minutesOfDay(at(0, 0))).toBe(0);
    expect(minutesOfDay(at(19, 30))).toBe(19 * 60 + 30);
  });
});

describe('isWithinWindow', () => {
  const evening = { startMin: 19 * 60, endMin: 6 * 60 };
  const daytime = { startMin: 9 * 60, endMin: 17 * 60 };

  it('handles a window that wraps past midnight', () => {
    expect(isWithinWindow(evening, 20 * 60)).toBe(true);
    expect(isWithinWindow(evening, 2 * 60)).toBe(true);
    expect(isWithinWindow(evening, 12 * 60)).toBe(false);
  });

  it('handles a same-day window', () => {
    expect(isWithinWindow(daytime, 12 * 60)).toBe(true);
    expect(isWithinWindow(daytime, 20 * 60)).toBe(false);
  });

  it('includes the start boundary and excludes the end boundary', () => {
    expect(isWithinWindow(daytime, 9 * 60)).toBe(true);
    expect(isWithinWindow(daytime, 17 * 60)).toBe(false);
  });
});

describe('isHazardActiveAt', () => {
  it('activates an unlit road only after dark', () => {
    expect(isHazardActiveAt(unlit, at(21))).toBe(true);
    expect(isHazardActiveAt(unlit, at(13))).toBe(false);
  });

  it('always activates a hazard with no window', () => {
    expect(isHazardActiveAt(pothole, at(3))).toBe(true);
    expect(isHazardActiveAt(pothole, at(13))).toBe(true);
  });

  it('never activates a fixed hazard', () => {
    expect(isHazardActiveAt(fixed, at(13))).toBe(false);
  });
});

describe('formatDepartureLabel', () => {
  it('says Leaving now when departing now', () => {
    expect(formatDepartureLabel(at(13, 5), true)).toBe('Leaving now');
  });

  it('shows a padded 24h time otherwise', () => {
    expect(formatDepartureLabel(at(9, 5), false)).toBe('Leaving 09:05');
    expect(formatDepartureLabel(at(21, 30), false)).toBe('Leaving 21:30');
  });
});

describe('isHazardActiveAt for an unlit road', () => {
  const road = (over: Partial<Hazard> = {}): Hazard =>
    ({
      id: 'hz-night',
      coord: { lng: 150.8931, lat: -34.4278 },
      kind: 'unlit',
      dangerLevel: 'moderate',
      status: 'active',
      streetName: 'Cliff Rd',
      // A stored window from before darkness was worked out properly. The
      // real sunset should win over it.
      activeWindow: { startMin: 19 * 60, endMin: 6 * 60 },
      reports: [],
      ...over,
    }) as Hazard;

  const on = (month: number, day: number, hour: number, minute = 0) =>
    new Date(2026, month, day, hour, minute, 0, 0);

  it('is a hazard at night whatever the season', () => {
    expect(isHazardActiveAt(road(), on(5, 21, 21))).toBe(true);
    expect(isHazardActiveAt(road(), on(11, 21, 22))).toBe(true);
  });

  it('is not a hazard at noon whatever the season', () => {
    expect(isHazardActiveAt(road(), on(5, 21, 12))).toBe(false);
    expect(isHazardActiveAt(road(), on(11, 21, 12))).toBe(false);
  });

  /**
   * The point of computing darkness rather than storing an hour: at 18:30 a
   * midwinter road is dark and a midsummer one is in broad daylight, and the
   * stored 19:00 window gets both wrong.
   */
  it('follows the season at 18:30, where the stored window cannot', () => {
    expect(isHazardActiveAt(road(), on(5, 21, 18, 30))).toBe(true);
    expect(isHazardActiveAt(road(), on(11, 21, 18, 30))).toBe(false);
  });

  it('is dark before dawn in midwinter but light by then in midsummer', () => {
    expect(isHazardActiveAt(road(), on(5, 21, 6, 15))).toBe(true);
    expect(isHazardActiveAt(road(), on(11, 21, 6, 15))).toBe(false);
  });

  it('still respects a hazard already fixed', () => {
    expect(isHazardActiveAt(road({ status: 'fixed' }), on(5, 21, 21))).toBe(false);
  });

  it('leaves other kinds on their stored window', () => {
    // A construction site with set hours is not an astronomical question.
    const works = road({ kind: 'construction', activeWindow: { startMin: 8 * 60, endMin: 16 * 60 } });
    expect(isHazardActiveAt(works, on(5, 21, 12))).toBe(true);
    expect(isHazardActiveAt(works, on(5, 21, 21))).toBe(false);
  });
});
