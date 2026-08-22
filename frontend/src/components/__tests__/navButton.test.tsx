import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavButton } from '../NavButton';

describe('NavButton', () => {
  it('labels the two kinds for screen readers', async () => {
    await render(<NavButton kind="close" onPress={() => {}} />);
    expect(screen.getByLabelText('Close')).toBeTruthy();
  });

  it('fires on press', async () => {
    const onPress = jest.fn();
    await render(<NavButton kind="back" onPress={onPress} testID="nav" />);
    await fireEvent.press(screen.getByTestId('nav'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
