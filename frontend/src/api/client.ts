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

/** React Native's FormData takes a {uri, name, type} object, not a Blob. */
function photoPart(uri: string, mimeType: string) {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  return { uri, name: `hazard.${ext}`, type: mimeType } as unknown as Blob;
}

export function fetchHazards(): Promise<Hazard[]> {
  return request<Hazard[]>('/api/hazards');
}

export function fetchHealth(): Promise<{ ok: boolean; aiEnabled: boolean }> {
  return request('/api/health');
}

/** Classify a photo without committing a report, so the rider sees it first. */
export function analyzePhoto(uri: string, mimeType: string): Promise<RemoteVerdict> {
  const form = new FormData();
  form.append('photo', photoPart(uri, mimeType));
  return request<RemoteVerdict>('/api/analyze', { method: 'POST', body: form });
}

export function submitReport(input: SubmitReportInput): Promise<HazardReport> {
  const form = new FormData();
  form.append('photo', photoPart(input.uri, input.mimeType));
  form.append('lng', String(input.at.lng));
  form.append('lat', String(input.at.lat));
  if (input.intent) form.append('intent', input.intent);
  if (input.hazardId) form.append('hazardId', input.hazardId);
  if (input.reporterName) form.append('reporterName', input.reporterName);
  if (input.dangerLevel) form.append('dangerLevel', input.dangerLevel);

  return request<HazardReport>('/api/reports', { method: 'POST', body: form });
}
