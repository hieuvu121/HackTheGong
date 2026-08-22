import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Hazard from '../hazard/[id]';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  // hz-2 is the unlit road: only a hazard between 19:00 and 06:00.
  useLocalSearchParams: () => ({ id: 'hz-2' }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

describe('Hazard detail, time-limited hazard', () => {
  it('states the hours it actually applies', async () => {
    await render(<Hazard />);
    expect(screen.getByTestId('active-window')).toBeTruthy();
    expect(screen.getByText(/between 19:00 and 06:00/)).toBeTruthy();
  });

  it('explains what the window means for routing', async () => {
    await render(<Hazard />);
    expect(screen.getByText(/not sent around it/)).toBeTruthy();
  });
});
