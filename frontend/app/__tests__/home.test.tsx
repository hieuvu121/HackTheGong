import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Home from '../index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

beforeEach(() => mockPush.mockClear());

describe('Home map screen', () => {
  it('offers the destination search entry point', async () => {
    await render(<Home />);
    expect(screen.getByText('Where to?')).toBeTruthy();
  });

  it('shows the departure time chip defaulting to now', async () => {
    await render(<Home />);
    expect(screen.getByTestId('time-chip')).toBeTruthy();
    expect(screen.getByText(/Leaving now/)).toBeTruthy();
  });

  it('moves departure to 21:00 so unlit hazards surface', async () => {
    await render(<Home />);
    await fireEvent.press(screen.getByTestId('time-chip'));
    expect(screen.getByText(/Leaving 21:00/)).toBeTruthy();
  });

  it('routes into the report flow from the floating button', async () => {
    await render(<Home />);
    await fireEvent.press(screen.getByTestId('report-fab'));
    expect(mockPush).toHaveBeenCalledWith('/report/capture');
  });

  it('no longer shows the hazard summary panel', async () => {
    await render(<Home />);
    expect(screen.queryByTestId('hazard-summary')).toBeNull();
    expect(screen.queryByText('Hazards near you')).toBeNull();
  });
});
