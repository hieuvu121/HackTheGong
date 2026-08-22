import { colors, radii, spacing, danger } from '../tokens';
import { type as t } from '../type';

describe('design tokens', () => {
  it('matches DESIGN.md colour values', () => {
    expect(colors.primary).toBe('#000000');
    expect(colors.canvasSoft).toBe('#efefef');
    expect(colors.body).toBe('#5e5e5e');
    expect(colors.mute).toBe('#afafaf');
  });

  it('uses the pill as the interactive radius', () => {
    expect(radii.pill).toBe(999);
    expect(radii.xl).toBe(16);
    expect(radii.md).toBe(8);
  });

  it('exposes the 3-tone safety accent separately from chrome', () => {
    expect(danger.dangerous.color).toBe('#d6202a');
    expect(danger.moderate.color).toBe('#f5a623');
    expect(danger.low.color).toBe('#1a9e5a');
  });

  it('sets display type at weight 700 and body at 400/500', () => {
    expect(t.displayXl.fontWeight).toBe('700');
    expect(t.bodyMd.fontWeight).toBe('400');
    expect(t.buttonMd.fontWeight).toBe('500');
  });

  it('keeps 4px spacing rhythm', () => {
    expect(spacing.lg).toBe(16);
    expect(spacing.xxl).toBe(24);
  });
});
