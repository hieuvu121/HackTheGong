import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Hazard from '../hazard/[id]';
import { Hazard as HazardType } from '../../src/data/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'hz-empty' }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

// A hazard the API seeded, or whose photos were removed: it exists, but nobody
// has photographed it. The screen used to read reports.at(-1).reportedAt and
// take the whole router down with it.
const empty: HazardType = {
  id: 'hz-empty',
  coord: { lng: 150.8955, lat: -34.4241 },
  kind: 'pothole',
  dangerLevel: 'moderate',
  status: 'active',
  streetName: 'Crown St',
  reports: [],
};

jest.mock('../../src/data/useHazards', () => ({
  useHazards: () => ({ hazards: [empty], source: 'api', loading: false, reload: jest.fn() }),
  useHazard: (id?: string) => ({ hazard: id === empty.id ? empty : undefined, loading: false }),
}));

describe('Hazard detail with no reports', () => {
  it('renders instead of crashing', async () => {
    await render(<Hazard />);
    expect(screen.getByText('Pothole / broken surface')).toBeTruthy();
  });

  it('omits the "last updated" clause it cannot compute', async () => {
    await render(<Hazard />);
    expect(screen.getByText('Crown St')).toBeTruthy();
    expect(screen.queryByText(/last updated/)).toBeNull();
  });

  it('invites the first photo rather than showing an empty carousel', async () => {
    await render(<Hazard />);
    expect(screen.getByText('No photos yet')).toBeTruthy();
    expect(screen.queryByTestId('photo-0')).toBeNull();
  });

  it('still offers the fix flow', async () => {
    await render(<Hazard />);
    expect(screen.getByText('Report as fixed')).toBeTruthy();
  });
});
