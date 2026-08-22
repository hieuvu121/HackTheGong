import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import Gate from '../report/gate';
import Analysis from '../report/analysis';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: mockPush }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => mockPush.mockClear());

describe('GPS gate', () => {
  it('allows submission when the rider is at the hazard', async () => {
    await render(<Gate />);
    expect(screen.getByTestId('gate-allowed')).toBeTruthy();
    expect(screen.getByText('Location confirmed')).toBeTruthy();
  });

  it('blocks submission and shows the distance when too far', async () => {
    await render(<Gate />);
    await fireEvent.press(screen.getByTestId('simulate-far'));
    expect(screen.getByTestId('gate-blocked')).toBeTruthy();
    expect(screen.getByText(/m away/)).toBeTruthy();
  });

  it('disables continue while blocked', async () => {
    await render(<Gate />);
    await fireEvent.press(screen.getByTestId('simulate-far'));
    await fireEvent.press(screen.getByTestId('gate-continue'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('lets the rider back inside the radius and continue', async () => {
    await render(<Gate />);
    await fireEvent.press(screen.getByTestId('simulate-far'));
    await fireEvent.press(screen.getByTestId('simulate-near'));
    await fireEvent.press(screen.getByTestId('gate-continue'));
    expect(mockPush).toHaveBeenCalledWith('/report/analysis');
  });
});

describe('AI analysis', () => {
  it('shows a working state then the verdict', async () => {
    await render(<Analysis />);
    expect(screen.getByTestId('analysing')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy(), { timeout: 4000 });
  });

  it('names the hazard kind and tier, without a confidence bar', async () => {
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByText('Construction')).toBeTruthy(), {
      timeout: 4000,
    });
    expect(screen.getByText('Dangerous')).toBeTruthy();
    expect(screen.queryByText('AI confidence')).toBeNull();
  });
});
