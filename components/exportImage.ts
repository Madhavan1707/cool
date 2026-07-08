// Offscreen phone-wallpaper rendering (1080×1920). Draws the deterministic
// resting shape from lib/particles.ts directly — no simulation, no live
// canvas involved — so the download always looks composed, not mid-scatter.
// Canvas work is impure, hence components/ rather than lib/.

import {
  PALETTES,
  PaletteId,
  WORLD_THEMES,
  hashUnit,
  paletteColor,
  shapeHomePosition,
  textToPersonPattern,
} from "@/lib/particles";

export interface WallpaperItem {
  /** Seed for the deterministic shape (a name, or `a + " " + b` for blends). */
  seed: string;
  /** Text drawn under the shape. */
  caption: string;
}

const WIDTH = 1080;
const HEIGHT = 1920;

// Home positions alone trace a thin curve; a small deterministic scatter
// makes the still image read as particles, like the live canvas at rest.
const SCATTER = 7;
const DOT_RADIUS = 3.4;

const CAPTION_MAX_WIDTH = 940;
const SITE_TAG = "fractalsofyou.vercel.app";

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function drawShape(
  context: CanvasRenderingContext2D,
  seed: string,
  centerX: number,
  centerY: number,
  shapeSize: number,
  stops: [number, number, number][]
) {
  const pattern = textToPersonPattern(seed);
  for (let i = 0; i < pattern.particleCount; i++) {
    const theta = i / pattern.particleCount;
    const home = shapeHomePosition(theta, shapeSize, pattern.shape);
    const angle = hashUnit(seed, `png-angle-${i}`) * Math.PI * 2;
    const dist = hashUnit(seed, `png-dist-${i}`) * SCATTER;
    const [r, g, b] = paletteColor(theta, stops);
    context.beginPath();
    context.fillStyle = `rgb(${r},${g},${b})`;
    context.arc(
      centerX - shapeSize / 2 + home.x + Math.cos(angle) * dist,
      centerY - shapeSize / 2 + home.y + Math.sin(angle) * dist,
      DOT_RADIUS,
      0,
      Math.PI * 2
    );
    context.fill();
  }
}

/** Shrinks the font until the text fits, so 64-char captions never clip. */
function drawCaption(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  baseSize: number,
  color: string
) {
  let fontSize = baseSize;
  do {
    context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    fontSize -= 2;
  } while (fontSize > 24 && context.measureText(text).width > CAPTION_MAX_WIDTH);
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y);
}

export async function renderWallpaperPng(
  palette: PaletteId,
  items: WallpaperItem[]
): Promise<Blob> {
  const theme = WORLD_THEMES[palette];
  const stops = PALETTES[palette];
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");

  const [trailR, trailG, trailB] = theme.trail;
  context.fillStyle = `rgb(${trailR},${trailG},${trailB})`;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // One shape fills the middle; two stack vertically, each with its caption.
  const layouts =
    items.length === 2
      ? [
          { centerY: 560, shapeSize: 660, captionY: 950, captionSize: 56 },
          { centerY: 1280, shapeSize: 660, captionY: 1670, captionSize: 56 },
        ]
      : [{ centerY: 820, shapeSize: 920, captionY: 1440, captionSize: 68 }];

  const [accentR, accentG, accentB] = hexToRgb(theme.accent);
  for (let i = 0; i < items.length; i++) {
    const layout = layouts[i];
    // A soft accent glow behind each shape gives the flat fill some depth.
    const glow = context.createRadialGradient(
      WIDTH / 2,
      layout.centerY,
      0,
      WIDTH / 2,
      layout.centerY,
      layout.shapeSize * 0.72
    );
    glow.addColorStop(0, `rgba(${accentR},${accentG},${accentB},0.16)`);
    glow.addColorStop(1, `rgba(${accentR},${accentG},${accentB},0)`);
    context.fillStyle = glow;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    drawShape(context, items[i].seed, WIDTH / 2, layout.centerY, layout.shapeSize, stops);
    drawCaption(
      context,
      items[i].caption,
      WIDTH / 2,
      layout.captionY,
      layout.captionSize,
      theme.ink
    );
  }

  context.font = '400 30px system-ui, -apple-system, "Segoe UI", sans-serif';
  context.fillStyle = theme.inkFaint;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(SITE_TAG, WIDTH / 2, 1830);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))),
      "image/png"
    );
  });
}

/** Triggers a client-side download of a blob; shared by PNG and clip export. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
