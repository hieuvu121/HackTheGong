import { Logger } from '@nestjs/common';

const log = new Logger('ImageFormat');

/** Quality for the JPEG we produce. High enough that a pothole stays legible. */
const TRANSCODE_QUALITY = 0.85;

/**
 * Formats only Apple platforms can read.
 *
 * An iPhone hands back the library original, which is HEIC. Two things then
 * break at once: OpenAI reads only jpeg, png, gif and webp, so every library
 * photo came back as a fallback verdict; and no browser outside Apple renders
 * HEIC, so the stored photo showed as broken in the carousel afterwards.
 */
const APPLE_ONLY = new Set(['image/heic', 'image/heif']);

const normalise = (mimeType: string) => mimeType.split(';')[0]!.trim().toLowerCase();

export function needsTranscode(mimeType: string): boolean {
  return APPLE_ONLY.has(normalise(mimeType));
}

export interface ReadableImage {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Turn a photo into something both the model and a browser can read.
 *
 * Anything already readable passes straight through — re-encoding a JPEG would
 * cost quality for nothing. A HEIC that will not decode also passes through:
 * the rider still gets their report and their photo, and the model already has
 * an honest fallback for a photo it could not read.
 */
export async function toReadableImage(
  buffer: Buffer,
  mimeType: string,
): Promise<ReadableImage> {
  if (!needsTranscode(mimeType)) return { buffer, mimeType };

  try {
    // Required lazily: it pulls in a wasm decoder, and only HEIC uploads pay.
    const convert = (await import('heic-convert')).default;
    const out = await convert({ buffer, format: 'JPEG', quality: TRANSCODE_QUALITY });
    const jpeg = Buffer.from(out);

    log.log(`Transcoded ${mimeType} → image/jpeg (${buffer.byteLength} → ${jpeg.byteLength} bytes)`);
    return { buffer: jpeg, mimeType: 'image/jpeg' };
  } catch (err) {
    log.warn(`Could not transcode ${mimeType}, keeping the original: ${(err as Error).message}`);
    return { buffer, mimeType };
  }
}
