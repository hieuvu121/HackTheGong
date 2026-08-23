import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Hazard from '../hazard/[id]';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  // hz-2 is the unlit road: only a hazard after dark, whenever that falls.
  useLocalSearchParams: () => ({ id: 'hz-2' }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

describe('Hazard detail, time-limited hazard', () => {
  it('states the hours it actually applies', async () => {
    await render(<Hazard />);
    expect(screen.getByTestId('active-window')).toBeTruthy();
    // Scoped: the seeded caption also mentions the dark.
    expect(screen.getByText(/Only a hazard after dark/)).toBeTruthy();
  });

  it('explains what the window means for routing', async () => {
    await render(<Hazard />);
    expect(screen.getByText(/not sent around it/)).toBeTruthy();
  });
});

describe('an unlit road states the hours it actually applies to', () => {
  /**
   * "Between 19:00 and 06:00" was a stored constant, and wrong for most of the
   * year — darkness moves over three hours here between the solstices. The
   * sheet now names the real hours for the day the rider is looking at.
   */
  it('names real dusk and dawn times rather than a fixed window', async () => {
    await render(<Hazard />);
    expect(screen.getByText(/Only a hazard after dark — tonight, \d{2}:\d{2} to \d{2}:\d{2}/)).toBeTruthy();
  });

  it('does not claim the old hardcoded window', async () => {
    await render(<Hazard />);
    expect(screen.queryByText(/between 19:00 and 06:00/)).toBeNull();
  });
});
