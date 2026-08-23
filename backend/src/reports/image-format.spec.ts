import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { needsTranscode, toReadableImage } from './image-format';

const jpeg = readFileSync(join(__dirname, '../../assets/hazards/pothole.jpg'));

describe('needsTranscode', () => {
  /**
   * The bug this exists for: an iPhone hands back HEIC, which OpenAI cannot
   * read — every library photo came back as a fallback verdict — and which no
   * browser outside Apple renders, so the stored photo showed as broken too.
   */
  it('flags the formats that only Apple platforms can read', () => {
    expect(needsTranscode('image/heic')).toBe(true);
    expect(needsTranscode('image/heif')).toBe(true);
  });

  it('leaves formats everything already reads alone', () => {
    expect(needsTranscode('image/jpeg')).toBe(false);
    expect(needsTranscode('image/png')).toBe(false);
    expect(needsTranscode('image/webp')).toBe(false);
  });

  it('is not fooled by case or parameters', () => {
    expect(needsTranscode('IMAGE/HEIC')).toBe(true);
    expect(needsTranscode('image/heic; charset=binary')).toBe(true);
  });
});

describe('toReadableImage', () => {
  it('passes a JPEG through untouched, byte for byte', async () => {
    const out = await toReadableImage(jpeg, 'image/jpeg');
    expect(out.mimeType).toBe('image/jpeg');
    expect(out.buffer).toBe(jpeg);
  });

  it('passes a PNG through rather than re-encoding it needlessly', async () => {
    const png = Buffer.from('not-really-a-png');
    const out = await toReadableImage(png, 'image/png');
    expect(out.mimeType).toBe('image/png');
    expect(out.buffer).toBe(png);
  });

  /**
   * A HEIC that will not decode must not cost the rider the report. The photo
   * is still stored and still shown; only the model misses out, and it already
   * has an honest fallback for that.
   */
  it('keeps the original when a HEIC cannot be decoded', async () => {
    const broken = Buffer.from('this is not heic data');
    const out = await toReadableImage(broken, 'image/heic');
    expect(out.buffer).toBe(broken);
    expect(out.mimeType).toBe('image/heic');
  });
});
