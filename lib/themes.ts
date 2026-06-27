export type ThemeName = 'neon' | 'aurora' | 'fire' | 'ice';

export interface ThemeConfig {
  bgColor: string;
  traceHueOffset: number;   // base hue added to time-driven hue rotation
  circleColor: string;      // rgba for epicycle circle outlines
  radiusColor: string;      // rgba for spoke lines
  accentHex: string;        // hex for UI accent
  accentRgb: string;        // "r, g, b" for rgba() usage
  label: string;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  neon: {
    bgColor: '#08080f',
    traceHueOffset: 150,
    circleColor: 'rgba(0, 255, 136, 0.08)',
    radiusColor: 'rgba(80, 190, 255, 0.75)',
    accentHex: '#00ff88',
    accentRgb: '0, 255, 136',
    label: 'Neon',
  },
  aurora: {
    bgColor: '#06060f',
    traceHueOffset: 270,
    circleColor: 'rgba(180, 100, 255, 0.08)',
    radiusColor: 'rgba(180, 100, 255, 0.75)',
    accentHex: '#bf5fff',
    accentRgb: '191, 95, 255',
    label: 'Aurora',
  },
  fire: {
    bgColor: '#0f0806',
    traceHueOffset: 20,
    circleColor: 'rgba(255, 100, 50, 0.08)',
    radiusColor: 'rgba(255, 150, 50, 0.75)',
    accentHex: '#ff6030',
    accentRgb: '255, 96, 48',
    label: 'Fire',
  },
  ice: {
    bgColor: '#060c0f',
    traceHueOffset: 195,
    circleColor: 'rgba(100, 200, 255, 0.08)',
    radiusColor: 'rgba(100, 220, 255, 0.75)',
    accentHex: '#60d0ff',
    accentRgb: '96, 208, 255',
    label: 'Ice',
  },
};

export const THEME_ORDER: ThemeName[] = ['neon', 'aurora', 'fire', 'ice'];

export function getTheme(name: ThemeName): ThemeConfig {
  return THEMES[name];
}

export function nextTheme(current: ThemeName): ThemeName {
  const idx = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
}
