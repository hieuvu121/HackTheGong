import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Onboarding from '../onboarding';
import { hasSeenOnboarding, resetOnboarding } from '../../src/lib/firstRun';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  mockReplace.mockClear();
  resetOnboarding();
});

describe('Onboarding', () => {
  it('explains both permissions it will ask for', async () => {
    await render(<Onboarding />);
    expect(screen.getByText('Your location')).toBeTruthy();
    expect(screen.getByText('Your camera')).toBeTruthy();
  });

  it('teaches the pin language before the map uses it', async () => {
    await render(<Onboarding />);
    expect(screen.getByTestId('pin-legend')).toBeTruthy();
    expect(screen.getByText(/says it’s fixed/)).toBeTruthy();
    expect(screen.getByText(/Low risk/)).toBeTruthy();
  });

  it('replaces itself with the map rather than stacking under it', async () => {
    await render(<Onboarding />);
    await fireEvent.press(screen.getByTestId('get-started'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('does not show itself again once finished', async () => {
    await render(<Onboarding />);
    expect(hasSeenOnboarding()).toBe(false);
    await fireEvent.press(screen.getByTestId('get-started'));
    expect(hasSeenOnboarding()).toBe(true);
  });
});
