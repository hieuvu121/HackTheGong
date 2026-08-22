import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Search from '../search';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: mockReplace, canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockBack.mockClear();
});

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
    expect(mockReplace).toHaveBeenCalledWith('/routes?placeId=pl-3');
  });

  it('shows an empty state when nothing matches', async () => {
    await render(<Search />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'zzzz');
    expect(screen.getByText('No places match that search.')).toBeTruthy();
  });

  it('can be dismissed', async () => {
    await render(<Search />);
    await fireEvent.press(screen.getByTestId('search-close'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('clears the query without retyping', async () => {
    await render(<Search />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'beach');
    await fireEvent.press(screen.getByTestId('search-clear'));
    expect(screen.getByTestId('search-input').props.value).toBe('');
  });

  it('takes the first result on submit', async () => {
    await render(<Search />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'beach');
    await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/routes?placeId='));
  });

  it('leaves the search modal behind rather than stacking on it', async () => {
    await render(<Search />);
    await fireEvent.press(screen.getByText('Wollongong Station'));
    expect(mockReplace).toHaveBeenCalled();
  });
});
