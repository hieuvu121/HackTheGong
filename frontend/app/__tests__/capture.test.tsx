import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import Capture from '../report/capture';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const mockTakePhoto = jest.fn();
const mockPickPhoto = jest.fn();
jest.mock('../../src/lib/photo', () => ({
  takePhoto: () => mockTakePhoto(),
  pickPhoto: () => mockPickPhoto(),
}));

const photo = { uri: 'file:///tmp/a.jpg', mimeType: 'image/jpeg', width: 100, height: 80 };

beforeEach(() => {
  mockPush.mockClear();
  mockTakePhoto.mockReset();
  mockPickPhoto.mockReset();
});

describe('Capture', () => {
  it('offers both the camera and the photo library', async () => {
    await render(<Capture />);
    expect(screen.getByTestId('shutter')).toBeTruthy();
    expect(screen.getByTestId('pick-photo')).toBeTruthy();
  });

  it('previews a photo taken with the camera', async () => {
    mockTakePhoto.mockResolvedValue(photo);
    await render(<Capture />);
    await fireEvent.press(screen.getByTestId('shutter'));
    await waitFor(() => expect(screen.getByTestId('photo-preview')).toBeTruthy());
  });

  it('previews a photo attached from the library', async () => {
    mockPickPhoto.mockResolvedValue(photo);
    await render(<Capture />);
    await fireEvent.press(screen.getByTestId('pick-photo'));
    await waitFor(() => expect(screen.getByTestId('photo-preview')).toBeTruthy());
  });

  it('carries the photo through to analysis', async () => {
    mockTakePhoto.mockResolvedValue(photo);
    await render(<Capture />);
    await fireEvent.press(screen.getByTestId('shutter'));
    await waitFor(() => expect(screen.getByTestId('use-photo')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('use-photo'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/report/analysis',
      params: { uri: photo.uri, mimeType: 'image/jpeg' },
    });
  });

  it('lets the rider retake a photo they do not like', async () => {
    mockTakePhoto.mockResolvedValue(photo);
    await render(<Capture />);
    await fireEvent.press(screen.getByTestId('shutter'));
    await waitFor(() => expect(screen.getByTestId('retake')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('retake'));
    expect(screen.getByTestId('shutter')).toBeTruthy();
  });

  it('explains a declined permission instead of failing silently', async () => {
    mockTakePhoto.mockResolvedValue(null);
    await render(<Capture />);
    await fireEvent.press(screen.getByTestId('shutter'));
    await waitFor(() => expect(screen.getByTestId('capture-error')).toBeTruthy());
  });
});
