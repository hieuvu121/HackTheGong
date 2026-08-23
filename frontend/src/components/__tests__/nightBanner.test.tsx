import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NightBanner } from '../NightBanner';
import { Hazard } from '../../data/types';
import { ORIGIN } from '../../data/locale';

const unlit = (id: string): Hazard =>
  ({
    id,
    coord: ORIGIN,
    kind: 'unlit',
    dangerLevel: 'moderate',
    status: 'active',
    streetName: 'Cliff Rd',
    reports: [],
  }) as Hazard;

const pothole: Hazard = { ...unlit('p'), kind: 'pothole' } as Hazard;

const night = new Date(2026, 5, 21, 21, 0);
const noon = new Date(2026, 5, 21, 12, 0);

describe('NightBanner', () => {
  it('warns once it is dark and unlit roads are about', async () => {
    await render(<NightBanner hazards={[unlit('a')]} at={night} coord={ORIGIN} />);
    expect(screen.getByTestId('night-banner')).toBeTruthy();
    expect(screen.getByText(/After dark/)).toBeTruthy();
  });

  it('counts the unlit roads, and only those', async () => {
    await render(
      <NightBanner hazards={[unlit('a'), unlit('b'), pothole]} at={night} coord={ORIGIN} />,
    );
    expect(screen.getByText(/2 unlit stretches/)).toBeTruthy();
  });

  it('says one stretch in the singular', async () => {
    await render(<NightBanner hazards={[unlit('a')]} at={night} coord={ORIGIN} />);
    expect(screen.getByText(/1 unlit stretch\b/)).toBeTruthy();
  });

  it('stays away in daylight', async () => {
    await render(<NightBanner hazards={[unlit('a')]} at={noon} coord={ORIGIN} />);
    expect(screen.queryByTestId('night-banner')).toBeNull();
  });

  it('stays away after dark when there are no unlit roads nearby', async () => {
    await render(<NightBanner hazards={[pothole]} at={night} coord={ORIGIN} />);
    expect(screen.queryByTestId('night-banner')).toBeNull();
  });

  it('says when the roads stop being a problem', async () => {
    await render(<NightBanner hazards={[unlit('a')]} at={night} coord={ORIGIN} />);
    expect(screen.getByText(/until \d{2}:\d{2}/)).toBeTruthy();
  });

  it('ignores an unlit road already reported fixed', async () => {
    const fixed = { ...unlit('a'), status: 'fixed' } as Hazard;
    await render(<NightBanner hazards={[fixed]} at={night} coord={ORIGIN} />);
    expect(screen.queryByTestId('night-banner')).toBeNull();
  });
});
