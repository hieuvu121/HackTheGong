import { appendPhoto, submitReport } from '../client';

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

describe('submitReport', () => {
  // Uploads go over XHR, not fetch — see src/api/upload.ts.
  class FakeXHR {
    static sent: FormData[] = [];
    status = 200;
    responseText = '{"id":"rp-new"}';
    timeout = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    ontimeout: (() => void) | null = null;
    open() {}
    send(body: FormData) {
      FakeXHR.sent.push(body);
      // Resolve on the next tick, the way a real request would.
      setTimeout(() => this.onload?.(), 0);
    }
  }

  const base = {
    uri: 'blob:http://localhost/abc',
    mimeType: 'image/jpeg',
    at: { lng: 150.8931, lat: -34.4278 },
  };

  beforeEach(() => {
    FakeXHR.sent = [];
    (global as { XMLHttpRequest?: unknown }).XMLHttpRequest = FakeXHR;
    // appendPhoto reads the uri back as a Blob on web.
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock).mockResolvedValue({
      blob: async () => new Blob(['jpeg'], { type: 'image/jpeg' }),
    });
  });

  it('puts the approved verdict on the wire under the names the API reads', async () => {
    // A typo in any of these field names fails silently: the API would ignore
    // the field, re-read the photo, and overwrite the rider's correction.
    await submitReport({
      ...base,
      kind: 'debris',
      caption: 'Branch down across the lane.',
      confidence: 0.72,
      verdictSource: 'rider',
      dangerLevel: 'dangerous',
    });

    const [form] = FakeXHR.sent;
    expect(form.get('kind')).toBe('debris');
    expect(form.get('caption')).toBe('Branch down across the lane.');
    expect(form.get('confidence')).toBe('0.72');
    expect(form.get('verdictSource')).toBe('rider');
    expect(form.get('dangerLevel')).toBe('dangerous');
  });

  it('sends a zero confidence rather than dropping it', async () => {
    // `if (confidence)` would skip 0 — the value a fallback verdict always has.
    await submitReport({ ...base, kind: 'pothole', caption: 'A hole.', confidence: 0 });
    expect(FakeXHR.sent[0].get('confidence')).toBe('0');
  });

  it('omits a verdict the caller did not supply, so the server still analyses', async () => {
    await submitReport(base);
    expect(FakeXHR.sent[0].get('kind')).toBeNull();
    expect(FakeXHR.sent[0].get('caption')).toBeNull();
  });
});
