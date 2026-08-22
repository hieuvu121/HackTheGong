import { HAZARDS } from '../hazards';
import { ROUTES } from '../routes';
import { PLACES } from '../places';

describe('fixtures', () => {
  it('has three route options', () => {
    expect(ROUTES).toHaveLength(3);
  });

  it('gives every route a geometry and steps ending in arrive', () => {
    for (const r of ROUTES) {
      expect(r.geometry.length).toBeGreaterThan(3);
      expect(r.steps[r.steps.length - 1].modifier).toBe('arrive');
    }
  });

  it('references only real hazard ids from routes', () => {
    const ids = new Set(HAZARDS.map((h) => h.id));
    for (const r of ROUTES) {
      for (const hid of r.hazardIds) expect(ids.has(hid)).toBe(true);
    }
  });

  it('gives unlit hazards an active window and others none', () => {
    for (const h of HAZARDS) {
      if (h.kind === 'unlit') expect(h.activeWindow).toBeDefined();
      else expect(h.activeWindow).toBeUndefined();
    }
  });

  it('orders each hazard report list oldest first', () => {
    for (const h of HAZARDS) {
      const times = h.reports.map((r) => Date.parse(r.reportedAt));
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
  });

  it('includes at least one fixed hazard and one multi-report hazard', () => {
    expect(HAZARDS.some((h) => h.status === 'fixed')).toBe(true);
    expect(HAZARDS.some((h) => h.reports.length > 1)).toBe(true);
  });

  it('has searchable places', () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(5);
  });

  it('keeps every step index inside its route geometry', () => {
    for (const r of ROUTES) {
      for (const s of r.steps) {
        expect(s.atIndex).toBeGreaterThanOrEqual(0);
        expect(s.atIndex).toBeLessThan(r.geometry.length);
      }
    }
  });
});
