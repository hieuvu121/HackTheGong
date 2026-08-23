import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Home from '../index';
import { markOnboardingSeen, resetOnboarding } from '../../src/lib/firstRun';

const mockPush = jest.fn();
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));
// Captures what the screen hands the map, so the tests can assert on the
// pins and the departure time rather than on pixels.
const mockMapProps: Record<string, unknown>[] = [];
jest.mock('../../src/map/MapView', () => (props: Record<string, unknown>) => {
  mockMapProps.push(props);
  return null;
});
const lastMap = () => mockMapProps[mockMapProps.length - 1];

beforeEach(() => {
  mockPush.mockClear();
  mockRedirect.mockClear();
  // The map is the post-onboarding state; the redirect has its own test.
  markOnboardingSeen();
});

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

  it('routes straight to the camera from the floating button', async () => {
    // A new report is filed where the rider stands, so there is no earlier
    // location to check it against — the photo and its coordinates are it.
    await render(<Home />);
    await fireEvent.press(screen.getByTestId('report-fab'));
    expect(mockPush).toHaveBeenCalledWith('/report/capture');
  });

  it('offers a way back to the rider’s own location', async () => {
    await render(<Home />);
    expect(screen.getByTestId('locate')).toBeTruthy();
  });

  it('no longer shows the hazard summary panel', async () => {
    await render(<Home />);
    expect(screen.queryByTestId('hazard-summary')).toBeNull();
    expect(screen.queryByText('Hazards near you')).toBeNull();
  });
});

describe('First launch', () => {
  it('sends a new rider through onboarding before the map', async () => {
    resetOnboarding();
    await render(<Home />);
    expect(mockRedirect).toHaveBeenCalledWith('/onboarding');
    expect(screen.queryByText('Where to?')).toBeNull();
  });

  it('goes straight to the map once onboarding is done', async () => {
    resetOnboarding();
    markOnboardingSeen();
    await render(<Home />);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByText('Where to?')).toBeTruthy();
  });
});

describe('unlit roads on the map', () => {
  /**
   * They used to vanish outside their hours, which left a rider planning an
   * evening ride at lunchtime with no way to see what was waiting for them.
   * They stay drawn now — dormant, so they read as not-yet-a-problem.
   */
  it('keeps unlit hazards on the map in daylight', async () => {
    await render(<Home />);
    const drawn = lastMap().hazards as { kind: string }[];
    expect(drawn.some((h) => h.kind === 'unlit')).toBe(true);
  });

  it('hands the map the time being planned for, so pins know if they count', async () => {
    await render(<Home />);
    expect(lastMap().at).toBeInstanceOf(Date);
  });

  it('never draws a hazard that has been retired', async () => {
    await render(<Home />);
    const drawn = lastMap().hazards as { status: string }[];
    expect(drawn.every((h) => h.status !== 'fixed')).toBe(true);
  });

  it('announces unlit roads once the departure time is after dark', async () => {
    await render(<Home />);
    expect(screen.queryByTestId('night-banner')).toBeNull();

    await fireEvent.press(screen.getByTestId('time-chip'));
    expect(screen.getByTestId('night-banner')).toBeTruthy();
  });
});
