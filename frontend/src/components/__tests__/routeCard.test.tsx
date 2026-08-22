import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RouteCard } from '../RouteCard';
import { ROUTES } from '../../data/routes';

const counts = { dangerous: 1, moderate: 2, low: 0, total: 3 };
const clear = { dangerous: 0, moderate: 0, low: 0, total: 0 };

const base = {
  route: ROUTES[0],
  selected: false,
  isSafest: false,
  onPress: () => {},
};

describe('RouteCard', () => {
  it('leads with the ETA, Google-style', async () => {
    await render(<RouteCard {...base} counts={counts} />);
    expect(screen.getByText('24 min')).toBeTruthy();
  });

  it('shows distance and street label', async () => {
    await render(<RouteCard {...base} counts={counts} />);
    expect(screen.getByText('5.8 km · via Cliff Rd')).toBeTruthy();
  });

  it('summarises hazards by tier', async () => {
    await render(<RouteCard {...base} counts={counts} />);
    expect(screen.getByText('3 hazards')).toBeTruthy();
  });

  it('says when a route is clear', async () => {
    await render(<RouteCard {...base} counts={clear} />);
    expect(screen.getByText('No known hazards')).toBeTruthy();
  });

  it('marks the safest route', async () => {
    await render(<RouteCard {...base} counts={counts} isSafest />);
    expect(screen.getByText('Safest')).toBeTruthy();
  });

  it('fires onPress', async () => {
    const onPress = jest.fn();
    await render(<RouteCard {...base} counts={counts} onPress={onPress} testID="rc" />);
    await fireEvent.press(screen.getByTestId('rc'));
    expect(onPress).toHaveBeenCalled();
  });
});
