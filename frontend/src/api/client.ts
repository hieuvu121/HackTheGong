import { Platform } from 'react-native';
import {
  Hazard,
  AIVerdict,
  HazardReport,
  LngLat,
  DangerLevel,
  HazardKind,
  VerdictSource,
} from '../data/types';
import { API_BASE_URL } from './config';
import { postMultipart } from './upload';

export type { VerdictSource };

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
  /**
   * The verdict the rider approved on the analysis screen, corrections and
   * all. Sent so the server files this report under what the rider actually
   * saw, instead of reading the photo a second time and overwriting it.
   */
  kind?: HazardKind;
  caption?: string;
  confidence?: number;
  verdictSource?: VerdictSource;
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
 * Attach the photo to a multipart body.
 *
 * The two platforms disagree about what a file is. React Native's FormData
 * takes a {uri, name, type} descriptor and streams the file itself; the
 * browser's ignores that object entirely and sends "[object Object]", which
 * the API rejects for having no photo field. On web the uri has to be read
 * into a real Blob first.
 */
export async function appendPhoto(
  form: FormData,
  uri: string,
  mimeType: string,
  isWeb: boolean = Platform.OS === 'web',
): Promise<void> {
  const name = `hazard.${mimeType.split('/')[1] ?? 'jpg'}`;

  if (isWeb) {
    const blob = await (await fetch(uri)).blob();
    form.append('photo', blob, name);
    return;
  }

  form.append('photo', { uri, name, type: mimeType } as unknown as Blob);
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
  return postMultipart<RemoteVerdict>('/api/analyze', form);
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
  if (input.kind) form.append('kind', input.kind);
  if (input.caption) form.append('caption', input.caption);
  if (input.confidence !== undefined) form.append('confidence', String(input.confidence));
  if (input.verdictSource) form.append('verdictSource', input.verdictSource);

  return postMultipart<HazardReport>('/api/reports', form);
}
