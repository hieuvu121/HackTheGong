import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useHazards, useHazard, resetHazardStore } from '../useHazards';
import { HAZARDS } from '../hazards';

const remote = [
  { ...HAZARDS[0], id: 'uuid-from-the-api', reports: [] },
];

function Probe({ label }: { label: string }) {
  const { hazards, source, loading } = useHazards();
  return (
    <Text testID={label}>{`${source}:${loading ? 'loading' : 'ready'}:${hazards
      .map((h) => h.id)
      .join(',')}`}</Text>
  );
}

beforeEach(() => {
  resetHazardStore();
  (global.fetch as jest.Mock).mockReset();
});

// The pending-fetch test deliberately leaves a promise unresolved; clearing the
// store afterwards keeps it from leaking into the next test or the runner.
afterEach(() => {
  resetHazardStore();
  (global.fetch as jest.Mock).mockReset();
});

describe('useHazards', () => {
  it('serves every consumer the same list, so ids always match', async () => {
    // The bug this replaces: the map resolved to the API while the hazard
    // sheet fell back to fixtures, so tapping a pin looked up an id the sheet
    // had never heard of and claimed the hazard no longer existed.
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => remote,
    });

    await render(
      <>
        <Probe label="map" />
        <Probe label="sheet" />
      </>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('map').props.children).toContain('uuid-from-the-api'),
    );
    expect(screen.getByTestId('sheet').props.children).toEqual(
      screen.getByTestId('map').props.children,
    );
  });

  it('fetches once no matter how many screens ask', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => remote });

    await render(
      <>
        <Probe label="a" />
        <Probe label="b" />
        <Probe label="c" />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId('a').props.children).toContain('ready'));
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('falls back to the bundled fixtures when the API is unreachable', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

    await render(<Probe label="offline" />);

    await waitFor(() =>
      expect(screen.getByTestId('offline').props.children).toContain('fixtures:ready'),
    );
    expect(screen.getByTestId('offline').props.children).toContain(HAZARDS[0].id);
  });

  it('reports loading until the first fetch settles', async () => {
    let release: (v: unknown) => void = () => {};
    (global.fetch as jest.Mock).mockReturnValue(new Promise((r) => {
      release = r;
    }));

    await render(<Probe label="pending" />);
    expect(screen.getByTestId('pending').props.children).toContain('loading');

    // Settle it so the runner is not left holding an open promise.
    release({ ok: true, json: async () => remote });
    await waitFor(() => expect(screen.getByTestId('pending').props.children).toContain('ready'));
  });
});

describe('useHazard', () => {
  function One({ id }: { id: string }) {
    const { hazard, loading } = useHazard(id);
    return <Text testID="one">{`${loading ? 'loading' : 'ready'}:${hazard?.streetName ?? 'none'}`}</Text>;
  }

  it('finds a hazard the API returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => remote });
    await render(<One id="uuid-from-the-api" />);
    await waitFor(() => expect(screen.getByTestId('one').props.children).toContain('ready'));
    expect(screen.getByTestId('one').props.children).toContain(remote[0].streetName);
  });

  it('still finds a fixture hazard the route screens point at', async () => {
    // Route planning references `hz-` ids, so those pins must resolve even
    // when the live list is full of API uuids.
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => remote });
    await render(<One id="hz-4" />);
    await waitFor(() => expect(screen.getByTestId('one').props.children).toContain('ready'));
    expect(screen.getByTestId('one').props.children).toContain('Princes Hwy');
  });

  it('reports a genuinely unknown id as missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => remote });
    await render(<One id="nope" />);
    await waitFor(() => expect(screen.getByTestId('one').props.children).toContain('ready'));
    expect(screen.getByTestId('one').props.children).toContain('none');
  });
});
