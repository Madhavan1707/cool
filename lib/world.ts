import {
  PALETTES,
  PaletteId,
  PersonPattern,
  hashUnit,
  paletteColor,
  shapeHomePosition,
} from "@/lib/particles";

/**
 * The 3D lift of a shape. Seen from straight above, the monument's plan view
 * is the exact 2D rose curve — same seed, same silhouette — so the shape the
 * user has been playing with reads as this object's shadow. Elevation comes
 * from the same wobble wave that bends the 2D outline (the wobble you see in
 * 2D *becomes* height in 3D), plus a whisper of seeded jitter. Everything is
 * deterministic per seed: a link always opens onto the same monument.
 */
export interface WorldShape {
  /** xyz triples in world units: x/z from the 2D curve, y = elevation around 0. */
  positions: Float32Array;
  /** rgb triples 0-1, same palette-by-theta coloring as the 2D canvas. */
  colors: Float32Array;
  count: number;
}

// Nominal scale the curve is built around; the actual max radius works out to
// ~0.72-0.9 world units (size * 0.36 * wobble in shapeHomePosition).
const SHAPE_RADIUS = 1;

// shapeHomePosition works in "canvas pixels" centered at size/2; feeding it a
// size of 2*radius and re-centering keeps one source of truth for the curve.
const CURVE_SIZE = SHAPE_RADIUS * 2;

export function buildWorldShape(
  seed: string,
  pattern: PersonPattern,
  palette: PaletteId,
  /** 0-1 brightness multiplier; horizon monuments render dimmed. */
  brightness = 1
): WorldShape {
  const count = pattern.particleCount;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const stops = PALETTES[palette];
  const { wobbleFreq, wobblePhase } = pattern.shape;
  const elevationAmp = 0.24 + hashUnit(seed, "elev-amp") * 0.2;

  for (let i = 0; i < count; i++) {
    const theta = i / count;
    const home = shapeHomePosition(theta, CURVE_SIZE, pattern.shape);
    const t = theta * Math.PI * 2;

    positions[i * 3] = home.x - CURVE_SIZE / 2;
    positions[i * 3 + 1] =
      Math.sin(wobbleFreq * t + wobblePhase) * elevationAmp +
      (hashUnit(seed, `elev-jitter${i}`) - 0.5) * 0.07;
    positions[i * 3 + 2] = home.y - CURVE_SIZE / 2;

    const [r, g, b] = paletteColor(theta, stops);
    colors[i * 3] = (r / 255) * brightness;
    colors[i * 3 + 1] = (g / 255) * brightness;
    colors[i * 3 + 2] = (b / 255) * brightness;
  }

  return { positions, colors, count };
}

export interface MonumentPlacement {
  seed: string;
  x: number;
  z: number;
}

/**
 * Ring positions for the nearest-miss monuments on the horizon. Spread evenly
 * so two misses never overlap, with each one's exact bearing and distance
 * nudged by its own hash — fixed facts of the strings, like everything else.
 */
export function missPlacements(misses: string[]): MonumentPlacement[] {
  const n = Math.max(1, misses.length);
  return misses.map((miss, i) => {
    const angle =
      (i / n) * Math.PI * 2 +
      (hashUnit(miss, "world-angle") - 0.5) * ((Math.PI * 2) / n) * 0.6;
    const dist = 7.5 + hashUnit(miss, "world-dist") * 4.5;
    return { seed: miss, x: Math.cos(angle) * dist, z: Math.sin(angle) * dist };
  });
}
