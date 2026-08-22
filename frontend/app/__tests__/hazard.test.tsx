import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Hazard from '../hazard/[id]';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'hz-1' }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');

beforeEach(() => mockPush.mockClear());

describe('Hazard detail', () => {
  it('names the hazard kind and street', async () => {
    await render(<Hazard />);
    expect(screen.getByText('Construction')).toBeTruthy();
    expect(screen.getByText(/Crown St/)).toBeTruthy();
  });

  it('shows the danger tier and the latest AI caption', async () => {
    await render(<Hazard />);
    expect(screen.getByText('Dangerous')).toBeTruthy();
    expect(screen.getByText(/no marked detour for bikes/)).toBeTruthy();
  });

  it('no longer shows a confidence bar', async () => {
    await render(<Hazard />);
    expect(screen.queryByText('AI confidence')).toBeNull();
  });

  it('shows every report photo from every user, newest first', async () => {
    await render(<Hazard />);
    expect(screen.getByText('Reported by 2 riders')).toBeTruthy();
    expect(screen.getByTestId('photo-0').props.children).toContain('Dan');
    expect(screen.getByTestId('photo-1').props.children).toContain('Mia');
  });

  it('routes into the fix flow via the location check, carrying the hazard id', async () => {
    await render(<Hazard />);
    await fireEvent.press(screen.getByText('Report as fixed'));
    expect(mockPush).toHaveBeenCalledWith('/report/gate?fixHazardId=hz-1');
  });

  it('can be dismissed', async () => {
    await render(<Hazard />);
    expect(screen.getByTestId('hazard-close')).toBeTruthy();
  });

  it('shows no time window for an all-hours hazard', async () => {
    await render(<Hazard />);
    expect(screen.queryByTestId('active-window')).toBeNull();
  });

  it('no longer offers the inert report-incorrect action', async () => {
    await render(<Hazard />);
    expect(screen.queryByText('Report incorrect')).toBeNull();
  });
});
