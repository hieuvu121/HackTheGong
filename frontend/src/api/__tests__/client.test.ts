import { appendPhoto } from '../client';

describe('appendPhoto', () => {
  beforeEach(() => (global.fetch as jest.Mock).mockReset());

  it('sends a real Blob on web, because the browser ignores RN file descriptors', async () => {
    // The bug this covers: a {uri, name, type} object serialises to
    // "[object Object]" in a browser, and the API rejects the request for
    // having no photo field at all.
    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    (global.fetch as jest.Mock).mockResolvedValue({ blob: async () => blob });

    const form = new FormData();
    await appendPhoto(form, 'blob:http://localhost/abc', 'image/jpeg', true);

    const sent = form.get('photo');
    expect(sent).toBeInstanceOf(Blob);
    expect(typeof sent).not.toBe('string');
  });

  it('names the web upload from its mime type', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      blob: async () => new Blob(['x'], { type: 'image/png' }),
    });

    const form = new FormData();
    await appendPhoto(form, 'blob:http://localhost/abc', 'image/png', true);
    expect((form.get('photo') as File).name).toBe('hazard.png');
  });

  it('passes a uri descriptor through on native, which streams the file itself', async () => {
    // Node's FormData flattens the descriptor to "[object Object]" — the very
    // behaviour that broke web — so the call is observed rather than the
    // stored value. React Native's own FormData keeps the object intact.
    const form = new FormData();
    const append = jest.spyOn(form, 'append');

    await appendPhoto(form, 'file:///tmp/a.jpg', 'image/jpeg', false);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      'photo',
      expect.objectContaining({ uri: 'file:///tmp/a.jpg', type: 'image/jpeg', name: 'hazard.jpeg' }),
    );
  });
});
