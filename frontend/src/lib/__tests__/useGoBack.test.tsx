import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useGoBack } from '../useGoBack';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
    push: jest.fn(),
  }),
}));

function Probe() {
  const goBack = useGoBack();
  return (
    <Pressable testID="leave" onPress={goBack}>
      <Text>Leave</Text>
    </Pressable>
  );
}

beforeEach(() => {
  mockBack.mockClear();
  mockReplace.mockClear();
  mockCanGoBack.mockReset();
});

describe('useGoBack', () => {
  it('pops the stack when there is history', async () => {
    mockCanGoBack.mockReturnValue(true);
    await render(<Probe />);
    await fireEvent.press(screen.getByTestId('leave'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('falls through to the map on a deep-linked screen with no history', async () => {
    // Without this, mockBack() is dropped with "GO_BACK was not handled by any
    // navigator" and the rider is stranded on a screen with a dead control.
    mockCanGoBack.mockReturnValue(false);
    await render(<Probe />);
    await fireEvent.press(screen.getByTestId('leave'));
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
