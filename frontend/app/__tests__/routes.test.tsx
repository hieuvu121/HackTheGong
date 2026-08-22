import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Routes from '../routes';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ placeId: 'pl-3' }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

beforeEach(() => mockPush.mockClear());

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
});
