import { OPTIONS } from '../photo';

describe('photo picker options', () => {
  /**
   * The bug this exists for: an iPhone hands back the library original, which
   * is HEIC. OpenAI accepts only jpeg, png, gif and webp, so every photo
   * picked from the library came back as a fallback verdict — and browsers
   * outside Apple cannot render HEIC either, so the photo showed as broken in
   * the carousel afterwards. "Compatible" makes the picker transcode to JPEG.
   */
  it('asks iOS for a format everything can actually read', () => {
    expect(OPTIONS.preferredAssetRepresentationMode).toBe('compatible');
  });

  it('still re-encodes rather than uploading a phone original whole', () => {
    expect(OPTIONS.quality).toBeGreaterThan(0);
    expect(OPTIONS.quality).toBeLessThan(1);
  });

  it('takes images only', () => {
    expect(OPTIONS.mediaTypes).toEqual(['images']);
  });
});
