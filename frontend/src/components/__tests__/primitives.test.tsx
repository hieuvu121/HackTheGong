import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '../Button';
import { DangerBadge } from '../DangerBadge';
import { danger } from '../../theme/tokens';

const flatten = (style: unknown) =>
  Array.isArray(style)
    ? Object.assign({}, ...style.flat(Infinity).filter(Boolean))
    : (style as Record<string, unknown>);

describe('Button', () => {
  it('renders its label and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="See routes" onPress={onPress} />);
    await fireEvent.press(screen.getByText('See routes'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Submit" onPress={onPress} disabled testID="btn" />);
    await fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps the primary CTA black and pill-shaped, never a danger colour', async () => {
    await render(<Button label="Go" onPress={() => {}} testID="btn" />);
    const flat = flatten(screen.getByTestId('btn').props.style);
    expect(flat.backgroundColor).toBe('#000000');
    expect(flat.borderRadius).toBe(999);
  });

  it('uses the documented 16px exception for the large variant', async () => {
    await render(<Button label="Go" onPress={() => {}} variant="large" testID="btn" />);
    expect(flatten(screen.getByTestId('btn').props.style).borderRadius).toBe(16);
  });
});

describe('DangerBadge', () => {
  it.each(['dangerous', 'moderate', 'low'] as const)(
    'renders the %s tier label',
    async (level) => {
      await render(<DangerBadge level={level} />);
      expect(screen.getByText(danger[level].label)).toBeTruthy();
    },
  );
});

