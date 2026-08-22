import { hazardPinState } from '../pins';
import { HAZARDS } from '../../data/hazards';
import { Hazard, HazardReport } from '../../data/types';

const report = (intent: 'report' | 'fix'): HazardReport => ({
  id: 'rp',
  hazardId: 'hz',
  photo: 'p',
  reportedAt: '2026-08-20T00:00:00Z',
  reporterName: 'Sam',
  intent,
  ai: { kind: 'pothole', dangerLevel: 'moderate', confidence: 0.8, caption: 'c' },
});

const hazard = (over: Partial<Hazard>): Hazard => ({
  id: 'hz',
  coord: { lng: 150.9, lat: -34.4 },
  kind: 'pothole',
  dangerLevel: 'moderate',
  status: 'active',
  streetName: 'Test St',
  reports: [report('report')],
  ...over,
});

describe('hazardPinState', () => {
  it('treats a reported, unfixed hazard as active', () => {
    expect(hazardPinState(hazard({}))).toBe('active');
  });

  it('marks a hazard unconfirmed once the newest report is a fix', () => {
    expect(hazardPinState(hazard({ reports: [report('report'), report('fix')] }))).toBe(
      'unconfirmed',
    );
  });

  it('stays active when a fix is followed by a fresh report', () => {
    expect(hazardPinState(hazard({ reports: [report('fix'), report('report')] }))).toBe('active');
  });

  it('leaves retired hazards to be filtered out, not restyled', () => {
    // Fixed hazards are never handed to the map, so the pin state only has to
    // describe what a drawn pin looks like.
    expect(hazardPinState(hazard({ status: 'fixed', reports: [report('report')] }))).toBe('active');
  });

  it('does not crash on a hazard with no reports', () => {
    expect(hazardPinState(hazard({ reports: [] }))).toBe('active');
  });

  it('classifies the fixtures', () => {
    const states = HAZARDS.map(hazardPinState);
    expect(states).toContain('active');
    expect(states).toContain('unconfirmed');
  });
});
