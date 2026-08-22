import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import Gate from '../report/gate';
import Analysis from '../report/analysis';
import { HAZARDS } from '../../src/data/hazards';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockPush, canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../../src/map/MapView', () => 'MapView');

// The rider's real position, stubbed per test.
const mockLocation = {
  status: 'granted' as string,
  coord: null as { lng: number; lat: number } | null,
  accuracyM: 8,
  refresh: jest.fn(),
};
jest.mock('../../src/lib/useLocation', () => ({
  useLocation: () => mockLocation,
}));

jest.mock('../../src/data/useHazards', () => {
  const { HAZARDS } = jest.requireActual('../../src/data/hazards');
  return {
    useHazards: () => ({ hazards: HAZARDS, source: 'fixtures', loading: false, reload: jest.fn() }),
    useHazard: (id?: string) => ({
      hazard: HAZARDS.find((h: { id: string }) => h.id === id),
      loading: false,
    }),
  };
});

const mockAnalyzePhoto = jest.fn();
const mockSubmitReport = jest.fn();
jest.mock('../../src/api/client', () => ({
  analyzePhoto: (...args: unknown[]) => mockAnalyzePhoto(...args),
  submitReport: (...args: unknown[]) => mockSubmitReport(...args),
}));

const target = HAZARDS.find((h) => h.id === 'hz-1')!;
const nudge = (metres: number) => ({
  lng: target.coord.lng,
  lat: target.coord.lat + metres / 111_320,
});

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockAnalyzePhoto.mockReset();
  mockSubmitReport.mockReset();
  mockParams = { fixHazardId: 'hz-1' };
  mockLocation.status = 'granted';
  mockLocation.coord = target.coord;
});

describe('GPS gate', () => {
  it('confirms a rider standing at the hazard', async () => {
    await render(<Gate />);
    expect(screen.getByTestId('gate-allowed')).toBeTruthy();
    expect(screen.getByText('Location confirmed')).toBeTruthy();
  });

  it('reports the real distance when the rider is too far', async () => {
    mockLocation.coord = nudge(400);
    await render(<Gate />);
    expect(screen.getByTestId('gate-blocked')).toBeTruthy();
    expect(screen.getByText(/m away/)).toBeTruthy();
  });

  it('opens the camera only from inside the radius', async () => {
    await render(<Gate />);
    await fireEvent.press(screen.getByTestId('gate-continue'));
    expect(mockPush).toHaveBeenCalledWith('/report/capture?fixHazardId=hz-1');
  });

  it('refuses to continue from outside it', async () => {
    mockLocation.coord = nudge(400);
    await render(<Gate />);
    await fireEvent.press(screen.getByTestId('gate-continue'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('has no way to fake the location', async () => {
    // The old simulate button is gone: a real GPS fix and a real photo are the
    // whole point of the check.
    await render(<Gate />);
    expect(screen.queryByTestId('simulate-far')).toBeNull();
    expect(screen.queryByText(/Simulate/)).toBeNull();
  });

  it('says so when the permission is off, rather than silently passing', async () => {
    mockLocation.status = 'denied';
    mockLocation.coord = nudge(400);
    await render(<Gate />);
    expect(screen.getByTestId('gate-no-location')).toBeTruthy();
    expect(screen.getByTestId('gate-blocked')).toBeTruthy();
  });

  it('shows a waiting state while the fix is still coming', async () => {
    mockLocation.status = 'pending';
    await render(<Gate />);
    expect(screen.getByTestId('gate-locating')).toBeTruthy();
  });
});

describe('Photo analysis', () => {
  const verdict = {
    kind: 'construction' as const,
    dangerLevel: 'dangerous' as const,
    confidence: 0.84,
    caption: 'Barriers across the bike lane.',
    source: 'openai' as const,
  };

  beforeEach(() => {
    mockParams = { uri: 'file:///tmp/photo.jpg', mimeType: 'image/jpeg' };
  });

  it('shows a working state, then the verdict', async () => {
    mockAnalyzePhoto.mockReturnValue(new Promise(() => {}));
    await render(<Analysis />);
    expect(screen.getByTestId('analysing')).toBeTruthy();
  });

  it('names the hazard kind and tier from the model', async () => {
    mockAnalyzePhoto.mockResolvedValue(verdict);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByText('Construction')).toBeTruthy());
    expect(screen.getByText('Dangerous')).toBeTruthy();
  });

  it('shows the model’s confidence, labelled as its own estimate', async () => {
    mockAnalyzePhoto.mockResolvedValue(verdict);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('confidence')).toBeTruthy());
    expect(screen.getByText('84%')).toBeTruthy();
    expect(screen.getByText(/own estimate/)).toBeTruthy();
  });

  it('says plainly when no model read the photo', async () => {
    mockAnalyzePhoto.mockResolvedValue({ ...verdict, confidence: 0, source: 'fallback' });
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByText('Not analysed')).toBeTruthy());
    expect(screen.queryByText('0%')).toBeNull();
  });

  it('lets the rider correct a rating they disagree with', async () => {
    mockAnalyzePhoto.mockResolvedValue(verdict);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('change-rating'));
    await fireEvent.press(screen.getByTestId('rate-low'));
    expect(screen.getByText('Low risk')).toBeTruthy();
    expect(screen.getByText('Changed by you')).toBeTruthy();
  });

  it('submits the photo, the position and the final rating', async () => {
    mockAnalyzePhoto.mockResolvedValue(verdict);
    mockSubmitReport.mockResolvedValue({ id: 'rp-new' });
    mockLocation.coord = { lng: 150.9, lat: -34.42 };

    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('submit-report'));

    await waitFor(() => expect(mockSubmitReport).toHaveBeenCalled());
    expect(mockSubmitReport).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'file:///tmp/photo.jpg',
        at: { lng: 150.9, lat: -34.42 },
        dangerLevel: 'dangerous',
        intent: 'report',
      }),
    );
  });

  it('lets the rider rewrite a description the model got wrong', async () => {
    mockAnalyzePhoto.mockResolvedValue(verdict);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('change-caption'));
    await fireEvent.changeText(
      screen.getByTestId('caption-input'),
      'Gravel washed across the path after the storm.',
    );

    expect(screen.getByDisplayValue('Gravel washed across the path after the storm.')).toBeTruthy();
  });

  it('lets the rider correct the hazard type', async () => {
    mockAnalyzePhoto.mockResolvedValue(verdict);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('change-kind'));
    await fireEvent.press(screen.getByTestId('kind-pothole'));

    expect(screen.getByText('Pothole / broken surface')).toBeTruthy();
    expect(screen.queryByTestId('kind-picker')).toBeNull();
  });

  it('stops crediting the model once the rider has rewritten it', async () => {
    // Showing a rider's own sentence under "84% model confidence" would be a
    // straightforward lie about where the words came from.
    mockAnalyzePhoto.mockResolvedValue(verdict);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('change-caption'));
    await fireEvent.changeText(screen.getByTestId('caption-input'), 'Loose gravel on the bend.');

    expect(screen.getByText('Your description')).toBeTruthy();
    expect(screen.queryByText('84%')).toBeNull();
  });

  it('submits the rider’s corrections, not the model’s draft', async () => {
    mockAnalyzePhoto.mockResolvedValue(verdict);
    mockSubmitReport.mockResolvedValue({ id: 'rp-new' });

    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('change-kind'));
    await fireEvent.press(screen.getByTestId('kind-debris'));
    await fireEvent.press(screen.getByTestId('change-caption'));
    await fireEvent.changeText(screen.getByTestId('caption-input'), 'Branch down across the lane.');
    await fireEvent.press(screen.getByTestId('submit-report'));

    await waitFor(() => expect(mockSubmitReport).toHaveBeenCalled());
    expect(mockSubmitReport).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'debris',
        caption: 'Branch down across the lane.',
        verdictSource: 'rider',
      }),
    );
  });

  it('credits the model when the rider changed nothing', async () => {
    mockAnalyzePhoto.mockResolvedValue(verdict);
    mockSubmitReport.mockResolvedValue({ id: 'rp-new' });

    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('submit-report'));

    await waitFor(() => expect(mockSubmitReport).toHaveBeenCalled());
    expect(mockSubmitReport).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'construction',
        caption: 'Barriers across the bike lane.',
        verdictSource: 'openai',
      }),
    );
  });

  it('keeps the rider on the screen when submitting fails', async () => {
    mockAnalyzePhoto.mockResolvedValue(verdict);
    mockSubmitReport.mockRejectedValue(new Error('Network request failed'));

    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('submit-report'));

    await waitFor(() => expect(screen.getByTestId('analysis-error')).toBeTruthy());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('still lets a report through when the photo could not be read', async () => {
    mockAnalyzePhoto.mockRejectedValue(new Error('502'));
    mockSubmitReport.mockResolvedValue({ id: 'rp-new' });

    await render(<Analysis />);
    await waitFor(() => expect(screen.getByText(/could not be read/)).toBeTruthy());
    await fireEvent.press(screen.getByTestId('submit-report'));
    await waitFor(() => expect(mockSubmitReport).toHaveBeenCalled());
  });
});
