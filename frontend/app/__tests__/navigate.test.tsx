import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import Navigate from '../navigate';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ routeId: 'rt-fast' }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Navigation', () => {
  it('shows the first upcoming maneuver on entry', async () => {
    await render(<Navigate />);
    expect(screen.getByText('Turn left onto Crown St')).toBeTruthy();
  });

  it('shows remaining time and distance', async () => {
    await render(<Navigate />);
    expect(screen.getByTestId('nav-footer')).toBeTruthy();
    expect(screen.getByText('15 min')).toBeTruthy();
  });

  it('advances to the next maneuver as the ride progresses', async () => {
    await render(<Navigate />);
    await act(async () => {
      jest.advanceTimersByTime(9000);
    });
    expect(screen.getByText('Merge onto Princes Hwy')).toBeTruthy();
  });

  it('counts the remaining distance down as the ride progresses', async () => {
    await render(<Navigate />);
    const before = screen.getByText(/km remaining/).props.children;
    await act(async () => {
      jest.advanceTimersByTime(9000);
    });
    expect(screen.getByText(/km remaining/).props.children).not.toEqual(before);
  });

  it('warns about a hazard ahead on a hazardous route', async () => {
    await render(<Navigate />);
    expect(screen.getByTestId('hazard-warning')).toBeTruthy();
  });
});
