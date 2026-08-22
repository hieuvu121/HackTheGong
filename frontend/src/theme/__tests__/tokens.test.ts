import { colors, radii, spacing, danger } from '../tokens';
import { type as t } from '../type';

describe('design tokens', () => {
  it('matches DESIGN.md colour values', () => {
    expect(colors.primary).toBe('#000000');
    expect(colors.canvasSoft).toBe('#efefef');
    expect(colors.body).toBe('#5e5e5e');
    // Deliberately darker than DESIGN.md: #afafaf failed contrast as text.
    expect(colors.mute).toBe('#767676');
  });

  it('uses the pill as the interactive radius', () => {
    expect(radii.pill).toBe(999);
    expect(radii.xl).toBe(16);
    expect(radii.md).toBe(8);
  });

  it('exposes the 3-tone safety accent separately from chrome', () => {
    expect(danger.dangerous.color).toBe('#d6202a');
    expect(danger.moderate.color).toBe('#a35f00');
    expect(danger.low.color).toBe('#0f7a43');
  });

  it('sets display type at weight 700 and body at 400/500', () => {
    expect(t.displayXl.fontWeight).toBe('700');
    expect(t.bodyMd.fontWeight).toBe('400');
    expect(t.buttonMd.fontWeight).toBe('500');
  });

  it('keeps every safety colour legible under a white glyph', () => {
    // 3:1 is the WCAG floor for graphics that carry meaning; these carry the
    // hazard glyph, so they are held to it.
    const lum = (hex: string) => {
      const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const tier of Object.values(danger)) {
      expect((1.05) / (lum(tier.color) + 0.05)).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps 4px spacing rhythm', () => {
    expect(spacing.lg).toBe(16);
    expect(spacing.xxl).toBe(24);
  });
});
