import { Platform } from 'react-native';
import { Hazard, AIVerdict, HazardReport, LngLat, DangerLevel } from '../data/types';
import { API_BASE_URL } from './config';

/** Where a verdict came from. A fallback is never dressed up as a real one. */
export type VerdictSource = 'openai' | 'fallback';

export interface RemoteVerdict extends AIVerdict {
  source: VerdictSource;
}

export interface SubmitReportInput {
  uri: string;
  mimeType: string;
  at: LngLat;
  intent?: 'report' | 'fix';
  hazardId?: string;
  reporterName?: string;
  /** A rider override of the model's rating. */
  dangerLevel?: DangerLevel;
}

const TIMEOUT_MS = 30_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read a local file URI into a Blob.
 *
 * XHR rather than fetch: Expo SDK 54 replaces React Native's fetch with a
 * spec-compliant one that does not resolve `file://` or `ph://` URIs, while
 * XHR still does.
 */
export function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error(`Could not read the photo at ${uri}`));
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

/**
 * Attach the photo to a multipart body, as a Blob on both platforms.
 *
 * React Native's own `{uri, name, type}` descriptor is not an option any more:
 * Expo's fetch encodes multipart itself and understands only strings and
 * Blobs, so a descriptor throws "Unsupported FormDataPart implementation". A
 * browser is no better — it flattens the same object to "[object Object]".
 *
 * The filename matters as much as the bytes. The encoder reads it off the part
 * to build content-disposition, and a part without one arrives as a text field
 * rather than a file, which the API rejects for having no photo at all. A bare
 * Blob carries no name, so one is attached.
 */
export async function appendPhoto(
  form: FormData,
  uri: string,
  mimeType: string,
  isWeb: boolean = Platform.OS === 'web',
): Promise<void> {
  const name = `hazard.${mimeType.split('/')[1] ?? 'jpg'}`;
  const blob = isWeb ? await (await fetch(uri)).blob() : await uriToBlob(uri);

  try {
    Object.defineProperty(blob, 'name', { value: name, configurable: true });
  } catch {
    // Some Blob implementations are frozen; the filename argument below still
    // carries the name on a spec-compliant FormData.
  }

  form.append('photo', blob, name);
}

export function fetchHazards(): Promise<Hazard[]> {
  return request<Hazard[]>('/api/hazards');
}

export function fetchHealth(): Promise<{ ok: boolean; aiEnabled: boolean }> {
  return request('/api/health');
}

/** Classify a photo without committing a report, so the rider sees it first. */
export async function analyzePhoto(uri: string, mimeType: string): Promise<RemoteVerdict> {
  const form = new FormData();
  await appendPhoto(form, uri, mimeType);
  return request<RemoteVerdict>('/api/analyze', { method: 'POST', body: form });
}

export async function submitReport(input: SubmitReportInput): Promise<HazardReport> {
  const form = new FormData();
  await appendPhoto(form, input.uri, input.mimeType);
  form.append('lng', String(input.at.lng));
  form.append('lat', String(input.at.lat));
  if (input.intent) form.append('intent', input.intent);
  if (input.hazardId) form.append('hazardId', input.hazardId);
  if (input.reporterName) form.append('reporterName', input.reporterName);
  if (input.dangerLevel) form.append('dangerLevel', input.dangerLevel);

  return request<HazardReport>('/api/reports', { method: 'POST', body: form });
}
