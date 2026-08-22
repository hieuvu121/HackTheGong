import { TextStyle } from 'react-native';

// Inter is DESIGN.md's documented open substitute for UberMove / UberMoveText.
const display = 'Inter, system-ui, "Helvetica Neue", Arial, sans-serif';
const text = 'Inter, system-ui, "Helvetica Neue", Arial, sans-serif';

export const type = {
  displayXxl: { fontFamily: display, fontSize: 52, fontWeight: '700', lineHeight: 64 },
  displayXl: { fontFamily: display, fontSize: 36, fontWeight: '700', lineHeight: 44 },
  displayLg: { fontFamily: display, fontSize: 32, fontWeight: '700', lineHeight: 40 },
  displayMd: { fontFamily: display, fontSize: 24, fontWeight: '700', lineHeight: 32 },
  displaySm: { fontFamily: display, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  bodyLg: { fontFamily: text, fontSize: 18, fontWeight: '500', lineHeight: 24 },
  bodyMd: { fontFamily: text, fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMdStrong: { fontFamily: text, fontSize: 16, fontWeight: '500', lineHeight: 20 },
  bodySm: { fontFamily: text, fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySmStrong: { fontFamily: text, fontSize: 14, fontWeight: '500', lineHeight: 16 },
  caption: { fontFamily: text, fontSize: 12, fontWeight: '400', lineHeight: 20 },
  buttonLarge: { fontFamily: text, fontSize: 18, fontWeight: '500', lineHeight: 24 },
  buttonMd: { fontFamily: text, fontSize: 16, fontWeight: '500', lineHeight: 20 },
} satisfies Record<string, TextStyle>;
