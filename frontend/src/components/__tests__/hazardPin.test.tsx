import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HazardPin } from '../HazardPin';

describe('HazardPin', () => {
  it('reports the hazard it marks to screen readers', async () => {
    await render(<HazardPin level="dangerous" state="active" label="Construction on Crown St" />);
    expect(screen.getByLabelText('Construction on Crown St')).toBeTruthy();
  });

  it('marks an unconfirmed hazard with a question glyph', async () => {
    await render(<HazardPin level="moderate" state="unconfirmed" label="Pothole" />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('uses the warning triangle, not a text glyph, while active', async () => {
    await render(<HazardPin level="dangerous" state="active" label="Construction" />);
    expect(screen.queryByText('?')).toBeNull();
    expect(screen.getByText('!')).toBeTruthy();
  });

  it('opens the hazard when tapped', async () => {
    const onPress = jest.fn();
    await render(
      <HazardPin level="dangerous" state="active" label="Construction" onPress={onPress} testID="pin" />,
    );
    await fireEvent.press(screen.getByTestId('pin'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
