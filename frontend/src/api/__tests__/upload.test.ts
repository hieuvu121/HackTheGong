import { postMultipart } from '../upload';

/**
 * A stand-in for the RN XMLHttpRequest, which is what actually streams a
 * {uri, name, type} file part off disk.
 */
class FakeXHR {
  static last: FakeXHR;
  status = 200;
  responseText = '{"ok":true}';
  timeout = 0;
  opened: [string, string] | null = null;
  sent: unknown = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  constructor() {
    FakeXHR.last = this;
  }
  open(method: string, url: string) {
    this.opened = [method, url];
  }
  send(body: unknown) {
    this.sent = body;
  }
  abort() {}
}

const xhr = () => new FakeXHR() as unknown as XMLHttpRequest;

describe('postMultipart', () => {
  /**
   * The bug this exists for: Expo SDK 57 replaces global fetch with its
   * WinterCG one, whose form encoder handles only strings and Blobs and throws
   * "Unsupported FormDataPart implementation" on React Native's {uri} file
   * descriptor. XHR still streams it, so uploads go over XHR.
   */
  it('sends the form over XHR rather than fetch', async () => {
    const form = new FormData();
    const result = postMultipart<{ ok: boolean }>('/api/analyze', form, xhr);

    FakeXHR.last.onload!();
    await expect(result).resolves.toEqual({ ok: true });
    expect(FakeXHR.last.opened![0]).toBe('POST');
    expect(FakeXHR.last.opened![1]).toContain('/api/analyze');
    expect(FakeXHR.last.sent).toBe(form);
  });

  it('never sets its own content-type, so the boundary survives', async () => {
    // Setting multipart/form-data by hand drops the generated boundary and the
    // server sees a body it cannot parse.
    const sent = postMultipart('/api/reports', new FormData(), xhr);
    expect('setRequestHeader' in FakeXHR.last).toBe(false);
    FakeXHR.last.onload!();
    await sent;
  });

  it('rejects with the server’s message on a failure status', async () => {
    const result = postMultipart('/api/reports', new FormData(), xhr);
    FakeXHR.last.status = 400;
    FakeXHR.last.responseText = 'Attach a photo as the "photo" field.';
    FakeXHR.last.onload!();
    await expect(result).rejects.toThrow(/400.*Attach a photo/s);
  });

  it('rejects when the request cannot reach the server at all', async () => {
    const result = postMultipart('/api/reports', new FormData(), xhr);
    FakeXHR.last.onerror!();
    await expect(result).rejects.toThrow(/Could not reach/);
  });

  it('gives up rather than hanging forever', async () => {
    const result = postMultipart('/api/reports', new FormData(), xhr);
    expect(FakeXHR.last.timeout).toBeGreaterThan(0);
    FakeXHR.last.ontimeout!();
    await expect(result).rejects.toThrow(/timed out/i);
  });

  it('surfaces a body that is not JSON instead of throwing a parse error', async () => {
    const result = postMultipart('/api/analyze', new FormData(), xhr);
    FakeXHR.last.responseText = '<html>502 Bad Gateway</html>';
    FakeXHR.last.onload!();
    await expect(result).rejects.toThrow(/unreadable|502/i);
  });
});
