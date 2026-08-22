import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Routes from '../routes';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ placeId: 'pl-3' }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

// The badge depends on departure time — after 19:00 the unlit hazard levels
// two of the routes — so the clock is pinned rather than left to whenever the
// suite happens to run.
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-08-22T09:00:00'));
  mockPush.mockClear();
});

afterEach(() => jest.useRealTimers());

describe('Route selection', () => {
  it('renders one card per route option', async () => {
    await render(<Routes />);
    expect(screen.getByText('24 min')).toBeTruthy();
    expect(screen.getByText('19 min')).toBeTruthy();
    expect(screen.getByText('15 min')).toBeTruthy();
  });

  it('names the chosen destination', async () => {
    await render(<Routes />);
    expect(screen.getByText('North Beach')).toBeTruthy();
  });

  it('marks the safest route rather than the fastest', async () => {
    await render(<Routes />);
    expect(screen.getByText('Safest')).toBeTruthy();
  });

  it('starts navigation with the selected route', async () => {
    await render(<Routes />);
    await fireEvent.press(screen.getByTestId('start-btn'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/navigate?routeId='));
  });

  it('lets the rider pick a different route before starting', async () => {
    await render(<Routes />);
    await fireEvent.press(screen.getByTestId('route-rt-fast'));
    await fireEvent.press(screen.getByTestId('start-btn'));
    expect(mockPush).toHaveBeenCalledWith('/navigate?routeId=rt-fast');
  });

  it('downgrades the badge when two routes are equally safe', async () => {
    // 21:00: the unlit hazard is live, both calm routes score the same, and
    // "Safest" would be an arbitrary pick between them.
    jest.setSystemTime(new Date('2026-08-22T21:00:00'));
    await render(<Routes />);
    expect(screen.queryByText('Safest')).toBeNull();
    expect(screen.getByText('Recommended')).toBeTruthy();
  });
});
