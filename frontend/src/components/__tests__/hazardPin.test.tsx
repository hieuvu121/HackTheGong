import React from 'react';
import { StyleSheet } from 'react-native';
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

describe('a hazard that only counts after dark', () => {
  /**
   * The rings are the pin saying "I am a problem right now". A road that is
   * only dark after dusk is not a problem at noon, so at noon it must not
   * pulse — but it stays on the map, so a rider planning an evening ride can
   * see what is coming.
   */
  it('stops pulsing once it is out of hours', async () => {
    await render(<HazardPin level="moderate" state="active" night dormant label="Cliff Rd" />);
    expect(screen.getByTestId('radar').props.children).toHaveLength(0);
  });

  it('pulses like any other hazard once it is dark', async () => {
    await render(<HazardPin level="moderate" state="active" night label="Cliff Rd" />);
    expect(screen.getByTestId('radar').props.children.length).toBeGreaterThan(0);
  });

  it('is marked as a night hazard whether or not it is dark yet', async () => {
    await render(<HazardPin level="moderate" state="active" night dormant label="Cliff Rd" />);
    expect(screen.getByTestId('night-marker')).toBeTruthy();
  });

  it('carries no night marker on an ordinary hazard', async () => {
    await render(<HazardPin level="dangerous" state="active" label="Pothole" />);
    expect(screen.queryByTestId('night-marker')).toBeNull();
  });

  it('says in words that it is only a hazard after dark', async () => {
    await render(<HazardPin level="moderate" state="active" night dormant label="No lighting on Cliff Rd" />);
    expect(screen.getByLabelText(/No lighting on Cliff Rd, only after dark/)).toBeTruthy();
  });

  it('fades out of hours, so it reads as quieter than a live hazard', async () => {
    const dormant = await render(
      <HazardPin level="moderate" state="active" night dormant label="a" testID="pin" />,
    );
    const opacityOf = (id: string) =>
      StyleSheet.flatten(screen.getByTestId(id).props.style).opacity as number;

    const faded = opacityOf('pin');
    dormant.unmount();

    await render(<HazardPin level="moderate" state="active" night label="a" testID="pin" />);
    expect(faded).toBeLessThan(opacityOf('pin'));
  });
});
