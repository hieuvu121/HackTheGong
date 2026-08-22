import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { darkColors, lightColors, type ThemePalette } from '../src/theme/tokens';

const declarations = (palette: ThemePalette) =>
  Object.entries(palette)
    .map(([name, value]) => `--cyclesafe-${name}:${value};`)
    .join('');

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `:root{${declarations(lightColors)}}@media (prefers-color-scheme:dark){:root{${declarations(darkColors)}}}html,body,#root{background:var(--cyclesafe-canvas)}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
