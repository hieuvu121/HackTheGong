import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import Analysis from '../report/analysis';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: mockPush, canGoBack: () => true }),
  useLocalSearchParams: () => ({
    uri: 'file:///tmp/fix.jpg',
    mimeType: 'image/jpeg',
    fixHazardId: 'hz-1',
  }),
}));
jest.mock('../../src/map/MapView', () => 'MapView');
jest.mock('../../src/lib/useLocation', () => ({
  useLocation: () => ({ status: 'granted', coord: { lng: 150.89, lat: -34.43 }, accuracyM: 8, refresh: jest.fn() }),
}));

const mockAnalyzePhoto = jest.fn();
const mockAnalyzeFix = jest.fn();
const mockSubmitReport = jest.fn();
jest.mock('../../src/api/client', () => ({
  analyzePhoto: (...a: unknown[]) => mockAnalyzePhoto(...a),
  analyzeFix: (...a: unknown[]) => mockAnalyzeFix(...a),
  submitReport: (...a: unknown[]) => mockSubmitReport(...a),
}));

const agrees = { fixed: true, confidence: 0.93, caption: 'Resurfaced, lane clear.', source: 'openai' };
const disagrees = { fixed: false, confidence: 0.88, caption: 'Barriers are still across the lane.', source: 'openai' };
const unread = { fixed: null, confidence: 0, caption: 'Could not check the photo.', source: 'fallback' };

beforeEach(() => {
  mockPush.mockClear();
  mockAnalyzePhoto.mockReset();
  mockAnalyzeFix.mockReset();
  mockSubmitReport.mockReset().mockResolvedValue({ id: 'rp-new' });
});

describe('checking a fix photo', () => {
  it('asks whether it is fixed, never what hazard it is', async () => {
    // The bug: a fix photo went through hazard classification and came back
    // "construction", so proof a pothole was gone read as a new hazard.
    mockAnalyzeFix.mockResolvedValue(agrees);
    await render(<Analysis />);
    await waitFor(() => expect(mockAnalyzeFix).toHaveBeenCalled());
    expect(mockAnalyzePhoto).not.toHaveBeenCalled();
    expect(mockAnalyzeFix).toHaveBeenCalledWith('file:///tmp/fix.jpg', 'image/jpeg', 'hz-1');
  });

  it('says so when the model agrees it is done', async () => {
    mockAnalyzeFix.mockResolvedValue(agrees);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('fix-verdict')).toBeTruthy());
    expect(screen.getByText(/looks fixed/i)).toBeTruthy();
    expect(screen.getByText(/Resurfaced, lane clear/)).toBeTruthy();
  });

  it('offers no hazard type or rating picker — it is not classifying a hazard', async () => {
    mockAnalyzeFix.mockResolvedValue(agrees);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('fix-verdict')).toBeTruthy());
    expect(screen.queryByTestId('change-kind')).toBeNull();
    expect(screen.queryByTestId('change-rating')).toBeNull();
  });

  describe('when the model disagrees', () => {
    beforeEach(() => mockAnalyzeFix.mockResolvedValue(disagrees));

    it('warns the rider', async () => {
      await render(<Analysis />);
      await waitFor(() => expect(screen.getByTestId('fix-disagreement')).toBeTruthy());
      expect(screen.getByText(/still looks like an active hazard/i)).toBeTruthy();
    });

    /** The rider stood there and the model did not. Their submission stands. */
    it('still lets them submit', async () => {
      await render(<Analysis />);
      await waitFor(() => expect(screen.getByTestId('fix-disagreement')).toBeTruthy());
      await fireEvent.press(screen.getByTestId('submit-report'));

      await waitFor(() => expect(mockSubmitReport).toHaveBeenCalled());
      expect(mockSubmitReport).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'fix', hazardId: 'hz-1', fixed: false }),
      );
    });
  });

  it('never warns when nothing read the photo', async () => {
    mockAnalyzeFix.mockResolvedValue(unread);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('fix-verdict')).toBeTruthy());
    expect(screen.queryByTestId('fix-disagreement')).toBeNull();
  });

  it('sends no verdict at all when nothing read the photo', async () => {
    mockAnalyzeFix.mockResolvedValue(unread);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('fix-verdict')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('submit-report'));

    await waitFor(() => expect(mockSubmitReport).toHaveBeenCalled());
    expect(mockSubmitReport.mock.calls[0][0].fixed).toBeNull();
  });

  it('lets the rider rewrite the description before submitting', async () => {
    mockAnalyzeFix.mockResolvedValue(agrees);
    await render(<Analysis />);
    await waitFor(() => expect(screen.getByTestId('fix-verdict')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('change-caption'));
    await fireEvent.changeText(screen.getByTestId('caption-input'), 'Council patched it Tuesday.');
    await fireEvent.press(screen.getByTestId('submit-report'));

    await waitFor(() => expect(mockSubmitReport).toHaveBeenCalled());
    expect(mockSubmitReport).toHaveBeenCalledWith(
      expect.objectContaining({ caption: 'Council patched it Tuesday.', verdictSource: 'rider' }),
    );
  });
});
