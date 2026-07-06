/** Deterministically hash a string into 32-bit unsigned integers (FNV-1a variants). */
function hash32(text: string, salt: string): number {
  let h = 2166136261;
  const input = salt + text;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(text: string, salt: string): number {
  return hash32(text, salt) / 0xffffffff;
}

export type PaletteId = "sunrise" | "ocean" | "neon" | "monochrome";

export const PALETTE_LABELS: Record<PaletteId, string> = {
  sunrise: "Sunrise",
  ocean: "Ocean",
  neon: "Neon",
  monochrome: "Monochrome",
};

/** Named gradient stops, each starting and ending on the same dark tone for a seamless color cycle. */
export const PALETTES: Record<PaletteId, [number, number, number][]> = {
  sunrise: [
    [12, 10, 40],
    [78, 26, 100],
    [173, 35, 95],
    [235, 87, 65],
    [250, 160, 62],
    [255, 214, 133],
    [255, 244, 214],
  ],
  ocean: [
    [6, 14, 38],
    [10, 54, 92],
    [15, 110, 130],
    [55, 170, 160],
    [140, 214, 190],
    [210, 245, 230],
    [255, 255, 250],
  ],
  neon: [
    [10, 6, 20],
    [90, 8, 130],
    [190, 20, 180],
    [80, 210, 230],
    [170, 255, 90],
    [255, 245, 80],
    [255, 250, 220],
  ],
  monochrome: [
    [10, 9, 8],
    [55, 48, 42],
    [110, 98, 86],
    [175, 160, 142],
    [225, 214, 198],
    [250, 245, 235],
    [255, 252, 248],
  ],
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Cycles smoothly through a palette's stops as `t` sweeps 0-1 (wraps beyond that range). */
export function paletteColor(t: number, stops: [number, number, number][]): [number, number, number] {
  const n = stops.length;
  const scaled = (((t % 1) + 1) % 1) * n;
  const idx = Math.floor(scaled);
  const frac = smoothstep(scaled - idx);
  const c0 = stops[idx % n];
  const c1 = stops[(idx + 1) % n];
  return [
    Math.round(lerp(c0[0], c1[0], frac)),
    Math.round(lerp(c0[1], c1[1], frac)),
    Math.round(lerp(c0[2], c1[2], frac)),
  ];
}

export interface FlowFieldParams {
  freqX: number;
  freqY: number;
  freqXY: number;
  phaseX: number;
  phaseY: number;
  phaseXY: number;
  swirl: number;
}

/**
 * Smoothly varying direction (radians) at a normalized position (roughly
 * -1..1 on each axis) and time in seconds. Three slowly-evolving sine/cosine
 * terms stand in for curl noise: cheap to evaluate per-particle per-frame,
 * deterministic per seed, and organic-looking without a full noise library.
 * Used as a small ambient jitter around each particle's home position, not
 * as the primary motion.
 */
export function flowAngle(x: number, y: number, t: number, p: FlowFieldParams): number {
  const slowT = t * 0.15;
  return (
    (Math.sin(p.freqX * x + p.phaseX + slowT) +
      Math.cos(p.freqY * y + p.phaseY + slowT * 0.8) +
      Math.sin(p.freqXY * (x + y) * 0.5 + p.phaseXY + slowT * 1.3)) *
    p.swirl
  );
}

/**
 * A closed rose/flower curve (r = cos(petals * theta)), personalized per
 * text, that particles rest on when undisturbed. Unlike a general Lissajous
 * curve, a rose curve stays a clean, recognizable N-petal flower for every
 * integer petal count — no risk of the messy, self-intersecting web that
 * arbitrary frequency pairs can produce.
 */
export interface ShapeParams {
  petals: number;
  rotation: number;
  wobbleFreq: number;
  wobblePhase: number;
  wobbleAmount: number;
}

/** Where particle `theta` (0-1, its fixed position around the curve) sits at rest, in pixels. */
export function shapeHomePosition(
  theta: number,
  size: number,
  shape: ShapeParams
): { x: number; y: number } {
  const t = theta * Math.PI * 2;
  const wobble = 1 + shape.wobbleAmount * Math.sin(shape.wobbleFreq * t + shape.wobblePhase);
  const r = size * 0.36 * wobble * Math.cos(shape.petals * t);
  const angle = t + shape.rotation;
  return {
    x: size / 2 + r * Math.cos(angle),
    y: size / 2 + r * Math.sin(angle),
  };
}

export interface PersonPattern {
  flow: FlowFieldParams;
  shape: ShapeParams;
  particleCount: number;
}

const PARTICLE_COUNT_MIN = 260;
const PARTICLE_COUNT_MAX = 460;

/** Turns arbitrary text into a personal particle pattern: a resting shape plus ambient jitter. */
export function textToPersonPattern(text: string): PersonPattern {
  return {
    flow: {
      freqX: 1.5 + unit(text, "fx") * 2.5,
      freqY: 1.5 + unit(text, "fy") * 2.5,
      freqXY: 1 + unit(text, "fxy") * 2,
      phaseX: unit(text, "px") * Math.PI * 2,
      phaseY: unit(text, "py") * Math.PI * 2,
      phaseXY: unit(text, "pxy") * Math.PI * 2,
      swirl: 0.6 + unit(text, "swirl") * 0.8,
    },
    shape: {
      petals: 2 + (hash32(text, "petals") % 6), // 2-7
      rotation: unit(text, "rotation") * Math.PI * 2,
      wobbleFreq: 3 + (hash32(text, "wobbleFreq") % 5),
      wobblePhase: unit(text, "wobblePhase") * Math.PI * 2,
      wobbleAmount: 0.06 + unit(text, "wobbleAmount") * 0.1,
    },
    particleCount:
      PARTICLE_COUNT_MIN + Math.round(unit(text, "count") * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN)),
  };
}
