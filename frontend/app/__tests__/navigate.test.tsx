import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import Navigate from '../navigate';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ routeId: 'rt-fast' }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

beforeEach(() => {
  jest.useFakeTimers();
  mockPush.mockClear();
});
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
    const before = screen.getByText(/km · arrive/).props.children;
    await act(async () => {
      jest.advanceTimersByTime(9000);
    });
    expect(screen.getByText(/km · arrive/).props.children).not.toEqual(before);
  });

  it('gives an arrival clock time, not just a duration', async () => {
    await render(<Navigate />);
    expect(screen.getByText(/arrive \d{2}:\d{2}/)).toBeTruthy();
  });

  it('says which side the hazard falls on', async () => {
    await render(<Navigate />);
    expect(screen.getByText(/on your (left|right)|straight ahead/)).toBeTruthy();
  });

  it('lets a rider report without ending the ride', async () => {
    await render(<Navigate />);
    await fireEvent.press(screen.getByTestId('report-while-riding'));
    expect(mockPush).toHaveBeenCalledWith('/report/capture');
  });

  it('warns about a hazard ahead on a hazardous route', async () => {
    await render(<Navigate />);
    expect(screen.getByTestId('hazard-warning')).toBeTruthy();
  });
});
