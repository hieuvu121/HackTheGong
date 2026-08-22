import { appendPhoto, uriToBlob } from '../client';

describe('appendPhoto', () => {
  beforeEach(() => (global.fetch as jest.Mock).mockReset());

  it('sends a Blob on web, because a browser flattens RN file descriptors', async () => {
    // A {uri, name, type} object serialises to "[object Object]" in a browser,
    // and the API rejects the request for having no photo field.
    (global.fetch as jest.Mock).mockResolvedValue({
      blob: async () => new Blob(['jpeg-bytes'], { type: 'image/jpeg' }),
    });

    const form = new FormData();
    await appendPhoto(form, 'blob:http://localhost/abc', 'image/jpeg', true);

    expect(form.get('photo')).toBeInstanceOf(Blob);
  });

  it('names the part, or the API sees a text field instead of a file', async () => {
    // Expo's multipart encoder reads the filename off the part to build
    // content-disposition; without one multer never registers a file.
    (global.fetch as jest.Mock).mockResolvedValue({
      blob: async () => new Blob(['x'], { type: 'image/png' }),
    });

    const form = new FormData();
    await appendPhoto(form, 'blob:http://localhost/abc', 'image/png', true);

    const part = form.get('photo') as File;
    expect(part.name).toBe('hazard.png');
  });

  it('reads the file over XHR on native, which fetch can no longer do', async () => {
    // Expo SDK 54's fetch does not resolve file:// URIs, and its encoder
    // rejects RN's uri descriptor outright.
    const blob = new Blob(['native-bytes'], { type: 'image/jpeg' });
    const xhr = {
      responseType: '',
      response: blob,
      onload: () => {},
      onerror: () => {},
      open: jest.fn(),
      send: jest.fn(function (this: { onload: () => void }) {
        setTimeout(() => this.onload(), 0);
      }),
    };
    (global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = jest.fn(() => xhr);

    const form = new FormData();
    await appendPhoto(form, 'file:///tmp/a.jpg', 'image/jpeg', false);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(xhr.open).toHaveBeenCalledWith('GET', 'file:///tmp/a.jpg', true);
    expect(form.get('photo')).toBeInstanceOf(Blob);
    expect((form.get('photo') as File).name).toBe('hazard.jpeg');
  });

  it('surfaces an unreadable photo rather than uploading nothing', async () => {
    const xhr = {
      responseType: '',
      response: null,
      onload: () => {},
      onerror: () => {},
      open: jest.fn(),
      send: jest.fn(function (this: { onerror: () => void }) {
        setTimeout(() => this.onerror(), 0);
      }),
    };
    (global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = jest.fn(() => xhr);

    await expect(uriToBlob('file:///tmp/missing.jpg')).rejects.toThrow(/Could not read the photo/);
  });
});
