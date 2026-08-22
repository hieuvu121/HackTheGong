import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { haversineMeters } from '../geo';
import { useLocation } from '../useLocation';
import { ORIGIN } from '../../data/locale';

const mockRequest = jest.fn();
const mockGetPosition = jest.fn();
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...a: unknown[]) => mockRequest(...a),
  getCurrentPositionAsync: (...a: unknown[]) => mockGetPosition(...a),
  Accuracy: { Balanced: 3 },
}));

/** The iOS Simulator's stock position — a granted fix 26,000km from the demo. */
const SAN_FRANCISCO = { longitude: -122.406417, latitude: 37.785834, accuracy: 5 };

function Probe() {
  const { coord, status } = useLocation();
  return (
    <Text testID="out">{coord ? `${status}:${coord.lng},${coord.lat}` : `${status}:none`}</Text>
  );
}

const read = async () => {
  await waitFor(() => expect(screen.getByTestId('out').props.children).not.toMatch(/:none$/));
  const [status, pair] = screen.getByTestId('out').props.children.split(':');
  const [lng, lat] = pair.split(',').map(Number);
  return { status, coord: { lng, lat } };
};

describe('useLocation', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockGetPosition.mockReset();
    delete process.env.EXPO_PUBLIC_DEMO_LOCATION;
  });

  it('uses the real fix when one is granted', async () => {
    mockRequest.mockResolvedValue({ granted: true });
    mockGetPosition.mockResolvedValue({ coords: SAN_FRANCISCO });

    render(<Probe />);
    const { status, coord } = await read();
    expect(status).toBe('granted');
    expect(coord.lng).toBeCloseTo(-122.406417, 4);
  });

  it('falls back near the demo origin when the permission is refused', async () => {
    mockRequest.mockResolvedValue({ granted: false });

    render(<Probe />);
    const { status, coord } = await read();
    expect(status).toBe('denied');
    expect(haversineMeters(ORIGIN, coord)).toBeLessThanOrEqual(1500);
  });

  describe('with EXPO_PUBLIC_DEMO_LOCATION set', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_DEMO_LOCATION = '1';
    });

    /**
     * The simulator hands out a granted fix in San Francisco, which is a real
     * answer to a real question — so nothing short of an explicit opt-in
     * should override it.
     */
    it('ignores a granted fix and reports near Wollongong instead', async () => {
      mockRequest.mockResolvedValue({ granted: true });
      mockGetPosition.mockResolvedValue({ coords: SAN_FRANCISCO });

      render(<Probe />);
      const { coord } = await read();
      expect(haversineMeters(ORIGIN, coord)).toBeLessThanOrEqual(1500);
    });

    it('says the position is synthetic rather than claiming a real fix', async () => {
      mockRequest.mockResolvedValue({ granted: true });
      mockGetPosition.mockResolvedValue({ coords: SAN_FRANCISCO });

      render(<Probe />);
      const { status } = await read();
      expect(status).toBe('demo');
    });

    it('never asks for the location permission at all', async () => {
      mockRequest.mockResolvedValue({ granted: true });
      mockGetPosition.mockResolvedValue({ coords: SAN_FRANCISCO });

      render(<Probe />);
      await read();
      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockGetPosition).not.toHaveBeenCalled();
    });
  });
});
