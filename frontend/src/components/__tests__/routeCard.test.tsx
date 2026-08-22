import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RouteCard } from '../RouteCard';
import { ROUTES } from '../../data/routes';

const counts = { dangerous: 1, moderate: 2, low: 0, total: 3 };
const clear = { dangerous: 0, moderate: 0, low: 0, total: 0 };

const base = {
  route: ROUTES[0],
  selected: false,
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

  it('breaks hazards down by tier rather than a bare count', async () => {
    // A bare total cannot justify the Safest badge: two routes can both carry
    // three hazards and score very differently.
    await render(<RouteCard {...base} counts={counts} />);
    expect(screen.getByText('1 dangerous')).toBeTruthy();
    expect(screen.getByText('2 moderate')).toBeTruthy();
  });

  it('omits tiers a route has none of', async () => {
    await render(<RouteCard {...base} counts={counts} />);
    expect(screen.queryByText(/low risk/)).toBeNull();
  });

  it('names each tier in text, never colour alone', async () => {
    await render(<RouteCard {...base} counts={{ dangerous: 0, moderate: 0, low: 2, total: 2 }} />);
    expect(screen.getByText('2 low risk')).toBeTruthy();
  });

  it('says when a route is clear', async () => {
    await render(<RouteCard {...base} counts={clear} />);
    expect(screen.getByText('No known hazards')).toBeTruthy();
  });

  it('marks the safest route', async () => {
    await render(<RouteCard {...base} counts={counts} badge="safest" />);
    expect(screen.getByText('Safest')).toBeTruthy();
  });

  it('falls back to Recommended when nothing is strictly safest', async () => {
    await render(<RouteCard {...base} counts={counts} badge="recommended" />);
    expect(screen.getByText('Recommended')).toBeTruthy();
    expect(screen.queryByText('Safest')).toBeNull();
  });

  it('badges nothing by default', async () => {
    await render(<RouteCard {...base} counts={counts} />);
    expect(screen.queryByText('Safest')).toBeNull();
    expect(screen.queryByText('Recommended')).toBeNull();
  });

  it('fires onPress', async () => {
    const onPress = jest.fn();
    await render(<RouteCard {...base} counts={counts} onPress={onPress} testID="rc" />);
    await fireEvent.press(screen.getByTestId('rc'));
    expect(onPress).toHaveBeenCalled();
  });
});
