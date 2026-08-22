import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Search from '../search';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => mockPush.mockClear());

describe('Destination search', () => {
  it('lists recent places before any query', async () => {
    await render(<Search />);
    expect(screen.getByText('Wollongong Station')).toBeTruthy();
  });

  it('filters places by name as the user types', async () => {
    await render(<Search />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'beach');
    expect(screen.getByText('North Beach')).toBeTruthy();
    expect(screen.queryByText('Wollongong Station')).toBeNull();
  });

  it('filters case-insensitively across name and address', async () => {
    await render(<Search />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'KEIRAVILLE');
    expect(screen.getByText('University of Wollongong')).toBeTruthy();
  });

  it('navigates to the route picker when a place is chosen', async () => {
    await render(<Search />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'beach');
    await fireEvent.press(screen.getByText('North Beach'));
    expect(mockPush).toHaveBeenCalledWith('/routes?placeId=pl-3');
  });

  it('shows an empty state when nothing matches', async () => {
    await render(<Search />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'zzzz');
    expect(screen.getByText('No places match that search.')).toBeTruthy();
  });
});
