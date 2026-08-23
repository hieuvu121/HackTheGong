import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Hazard from '../hazard/[id]';
import { Hazard as HazardType } from '../../src/data/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'hz-x' }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

let mockHazard: HazardType;
jest.mock('../../src/data/useHazards', () => ({
  useHazards: () => ({ hazards: [], source: 'fixtures', loading: false, reload: jest.fn() }),
  useHazard: () => ({ hazard: mockHazard, loading: false }),
}));

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const build = (over: Partial<HazardType>, lastReportDaysAgo: number): HazardType =>
  ({
    id: 'hz-x',
    coord: { lng: 150.89, lat: -34.43 },
    kind: 'pothole',
    dangerLevel: 'moderate',
    status: 'active',
    streetName: 'Keira St',
    expectedClearDays: null,
    reports: [
      {
        id: 'rp-1',
        hazardId: 'hz-x',
        photo: 'pothole-a',
        reportedAt: daysAgo(lastReportDaysAgo),
        reporterName: 'Sam',
        intent: 'report',
        ai: { kind: 'pothole', dangerLevel: 'moderate', confidence: 0.8, caption: 'A hole.' },
      },
    ],
    ...over,
  }) as HazardType;

describe('the "may already be fixed" note', () => {
  it('appears on a pothole nobody has confirmed in longer than it takes to patch', async () => {
    mockHazard = build({}, 40);
    await render(<Hazard />);
    expect(screen.getByTestId('stale-note')).toBeTruthy();
    expect(screen.getByText(/40 days/)).toBeTruthy();
    expect(screen.getByText(/may already be fixed/i)).toBeTruthy();
  });

  it('stays away while the hazard is still young', async () => {
    mockHazard = build({}, 5);
    await render(<Hazard />);
    expect(screen.queryByTestId('stale-note')).toBeNull();
  });

  it('never appears on a hazard that does not simply get repaired', async () => {
    mockHazard = build({ kind: 'unlit' }, 400);
    await render(<Hazard />);
    expect(screen.queryByTestId('stale-note')).toBeNull();
  });
});

describe('a hazard one rider says is done', () => {
  it('says so, and asks the next rider to confirm', async () => {
    const h = build({}, 3);
    h.reports.push({ ...h.reports[0], id: 'rp-2', intent: 'fix', reporterName: 'Tom' });
    mockHazard = h;

    await render(<Hazard />);
    expect(screen.getByTestId('might-be-done')).toBeTruthy();
    expect(screen.getByText(/confirm/i)).toBeTruthy();
  });

  it('is not shown while every report still says the hazard is there', async () => {
    mockHazard = build({}, 3);
    await render(<Hazard />);
    expect(screen.queryByTestId('might-be-done')).toBeNull();
  });

  it('gives way to the Fixed tag once the hazard is retired', async () => {
    const h = build({ status: 'fixed' }, 3);
    h.reports.push({ ...h.reports[0], id: 'rp-2', intent: 'fix', reporterName: 'Tom' });
    mockHazard = h;

    await render(<Hazard />);
    expect(screen.getByText('Fixed')).toBeTruthy();
    expect(screen.queryByTestId('might-be-done')).toBeNull();
  });
});
