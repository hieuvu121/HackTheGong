import { civilDusk, civilDawn, nightWindowFor, isAfterDark } from '../sun';
import { ORIGIN } from '../../data/locale';

// Wollongong, -34.4278, 150.8931. Published civil twilight ends about 17:20 in
// midwinter and about 20:35 in midsummer — over three hours apart, which is
// the whole reason a fixed hour cannot work.
const MIDWINTER = new Date(2026, 5, 21, 12, 0, 0);
const MIDSUMMER = new Date(2026, 11, 21, 12, 0, 0);

const within = (actual: Date, expected: string, minutes: number) => {
  const [h, m] = expected.split(':').map(Number);
  const target = new Date(actual);
  target.setHours(h, m, 0, 0);
  return Math.abs(actual.getTime() - target.getTime()) <= minutes * 60_000;
};

describe('civil dusk in Wollongong', () => {
  it('falls in the early evening at midwinter', () => {
    expect(within(civilDusk(ORIGIN, MIDWINTER), '17:20', 25)).toBe(true);
  });

  it('falls three hours later at midsummer', () => {
    expect(within(civilDusk(ORIGIN, MIDSUMMER), '20:35', 25)).toBe(true);
  });

  /** The bug a fixed 18:00 would cause, stated as a test. */
  it('is before 18:00 in midwinter and after it in midsummer', () => {
    expect(civilDusk(ORIGIN, MIDWINTER).getHours()).toBeLessThan(18);
    expect(civilDusk(ORIGIN, MIDSUMMER).getHours()).toBeGreaterThanOrEqual(18);
  });
});

describe('civil dawn', () => {
  it('comes before dusk on the same day', () => {
    expect(civilDawn(ORIGIN, MIDWINTER).getTime()).toBeLessThan(
      civilDusk(ORIGIN, MIDWINTER).getTime(),
    );
  });

  it('is later in midwinter than in midsummer', () => {
    expect(civilDawn(ORIGIN, MIDWINTER).getHours()).toBeGreaterThan(
      civilDawn(ORIGIN, MIDSUMMER).getHours(),
    );
  });
});

describe('nightWindowFor', () => {
  it('wraps past midnight, the way the hazard windows already do', () => {
    const w = nightWindowFor(ORIGIN, MIDWINTER);
    expect(w.startMin).toBeGreaterThan(w.endMin);
  });

  it('runs from dusk to dawn', () => {
    const w = nightWindowFor(ORIGIN, MIDWINTER);
    const dusk = civilDusk(ORIGIN, MIDWINTER);
    expect(w.startMin).toBe(dusk.getHours() * 60 + dusk.getMinutes());
  });
});

describe('isAfterDark', () => {
  const at = (date: Date, h: number, m = 0) => {
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  };

  it('says yes at 21:00 in any season', () => {
    expect(isAfterDark(ORIGIN, at(MIDWINTER, 21))).toBe(true);
    expect(isAfterDark(ORIGIN, at(MIDSUMMER, 21))).toBe(true);
  });

  it('says no at noon in any season', () => {
    expect(isAfterDark(ORIGIN, at(MIDWINTER, 12))).toBe(false);
    expect(isAfterDark(ORIGIN, at(MIDSUMMER, 12))).toBe(false);
  });

  /**
   * 18:30 is the case a fixed "after 6pm" rule gets wrong twice over: dark in
   * midwinter, broad daylight in midsummer.
   */
  it('splits on the season at 18:30, where a fixed hour cannot', () => {
    expect(isAfterDark(ORIGIN, at(MIDWINTER, 18, 30))).toBe(true);
    expect(isAfterDark(ORIGIN, at(MIDSUMMER, 18, 30))).toBe(false);
  });

  it('says yes in the small hours, before dawn', () => {
    expect(isAfterDark(ORIGIN, at(MIDWINTER, 3))).toBe(true);
  });
});
