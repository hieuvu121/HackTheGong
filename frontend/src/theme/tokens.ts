export const colors = {
  primary: '#000000',
  onPrimary: '#ffffff',
  ink: '#000000',
  body: '#5e5e5e',
  mute: '#afafaf',
  hairlineMid: '#4b4b4b',
  canvas: '#ffffff',
  canvasSoft: '#efefef',
  canvasSofter: '#f3f3f3',
  surfacePressed: '#e2e2e2',
  link: '#0000ee',
  onDark: '#ffffff',
  blackElevated: '#282828',
} as const;

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  none: 0,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
  pillTab: 36,
  full: 9999,
} as const;

export const shadows = {
  level1: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  level2: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  level3: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
} as const;

// The single deliberate deviation from DESIGN.md's mono rule.
// Used ONLY on hazard pins, danger badges, confidence bars. Never on CTAs.
export const danger = {
  dangerous: { color: '#d6202a', label: 'Dangerous', fill: 'solid' as const },
  moderate: { color: '#f5a623', label: 'Moderate', fill: 'half' as const },
  low: { color: '#1a9e5a', label: 'Low risk', fill: 'outline' as const },
} as const;
