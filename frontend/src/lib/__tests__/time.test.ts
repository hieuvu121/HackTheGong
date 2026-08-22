import { minutesOfDay, isWithinWindow, isHazardActiveAt, formatDepartureLabel } from '../time';
import { Hazard } from '../../data/types';

const at = (h: number, m = 0) => new Date(2026, 7, 22, h, m);

const unlit: Hazard = {
  id: 'u',
  coord: { lng: 0, lat: 0 },
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
