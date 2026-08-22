import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Where the API lives.
 *
 * A simulator can reach the host as localhost; a physical phone cannot, so the
 * LAN address Metro is already serving from is used instead. Override with
 * EXPO_PUBLIC_API_URL when the API runs somewhere else.
 */
function inferBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  if (Platform.OS === 'web') return 'http://localhost:3000';

  // e.g. "192.168.1.20:8081" — reuse the host, swap Metro's port for the API's.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export const API_BASE_URL = inferBaseUrl();

/** Uploads are returned as absolute paths like /uploads/abc.jpg. */
export function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}
