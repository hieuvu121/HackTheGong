import { API_BASE_URL } from './config';

const TIMEOUT_MS = 30_000;

/**
 * POST a multipart form, over XMLHttpRequest rather than fetch.
 *
 * Expo SDK 57 replaces the global `fetch` with its WinterCG implementation,
 * whose form encoder accepts only strings, Blobs, and objects exposing
 * `bytes()` — it throws "Unsupported FormDataPart implementation" on React
 * Native's `{uri, name, type}` file descriptor, which is the only way to hand
 * off a photo on device without reading the whole thing into JS memory (and
 * React Native's Blob cannot be built from bytes in JS anyway).
 *
 * XHR still routes through React Native's own networking, which understands
 * that descriptor and streams the file off disk. Uploads go this way; every
 * other call still uses fetch.
 */
export function postMultipart<T>(
  path: string,
  form: FormData,
  createRequest: () => XMLHttpRequest = () => new XMLHttpRequest(),
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const request = createRequest();
    request.open('POST', `${API_BASE_URL}${path}`);
    request.timeout = TIMEOUT_MS;

    // Content-Type is left alone on purpose: setting it by hand drops the
    // generated boundary and the server cannot parse the body.

    request.onload = () => {
      const body = request.responseText ?? '';

      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`${request.status}${body ? ` — ${body.slice(0, 200)}` : ''}`));
        return;
      }

      try {
        resolve(JSON.parse(body) as T);
      } catch {
        reject(new Error(`The server sent an unreadable reply: ${body.slice(0, 120)}`));
      }
    };

    request.onerror = () => reject(new Error('Could not reach the server.'));
    request.ontimeout = () => reject(new Error('The upload timed out.'));

    request.send(form);
  });
}
