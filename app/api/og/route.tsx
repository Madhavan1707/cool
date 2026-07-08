import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import {
  PALETTES,
  PaletteId,
  WORLD_THEMES,
  hashUnit,
  paletteColor,
  shapeHomePosition,
  textToPersonPattern,
} from "@/lib/particles";

// Social-card preview for shared links: the same deterministic rose-curve
// shape the app renders live, drawn once as static SVG dots. Everything here
// consumes only the pure functions in lib/particles.ts, so a link's preview
// always matches what the recipient will see after opening it.

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_TEXT = 64; // same clamp the app applies to a/b params

// Home positions alone trace a thin curve; a small deterministic scatter
// reads as "particles" instead of a dotted line.
const SCATTER = 6;
const DOT_RADIUS = 2.6;

function ShapeSvg({
  seed,
  size,
  stops,
}: {
  seed: string;
  size: number;
  stops: [number, number, number][];
}) {
  const pattern = textToPersonPattern(seed);
  const dots = [];
  for (let i = 0; i < pattern.particleCount; i++) {
    const theta = i / pattern.particleCount;
    const home = shapeHomePosition(theta, size, pattern.shape);
    const angle = hashUnit(seed, `og-angle-${i}`) * Math.PI * 2;
    const dist = hashUnit(seed, `og-dist-${i}`) * SCATTER;
    const [r, g, b] = paletteColor(theta, stops);
    dots.push(
      <circle
        key={i}
        cx={home.x + Math.cos(angle) * dist}
        cy={home.y + Math.sin(angle) * dist}
        r={DOT_RADIUS}
        fill={`rgb(${r},${g},${b})`}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {dots}
    </svg>
  );
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const a = params.get("a")?.slice(0, MAX_TEXT) || null;
    const b = params.get("b")?.slice(0, MAX_TEXT) || null;
    const blend = params.get("v") === "blend" && !!a && !!b;
    const paletteParam = params.get("p");
    const palette: PaletteId =
      paletteParam && paletteParam in PALETTES ? (paletteParam as PaletteId) : "sunrise";
    const theme = WORLD_THEMES[palette];
    const stops = PALETTES[palette];

    const title = a && b ? (blend ? `${a} × ${b}` : `${a} & ${b}`) : a || b || "Fractals of You";
    const subtitle =
      a && b
        ? blend
          ? "one living particle shape, grown from two names"
          : "two living particle shapes, grown from two names"
        : a || b
          ? "a living particle shape, grown from a name"
          : "type anything — it becomes a shape that belongs only to you";
    const seeds = blend ? [`${a} ${b}`] : [a, b].filter((s): s is string => s !== null);
    if (seeds.length === 0) seeds.push("hello");

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            backgroundColor: `rgb(${theme.trail.join(",")})`,
            padding: "48px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flexGrow: 1,
              paddingRight: 48,
              maxWidth: seeds.length === 2 ? 380 : 560,
            }}
          >
            <div
              style={{
                fontSize: title.length > 24 ? 44 : 64,
                fontWeight: 700,
                color: theme.ink,
                lineHeight: 1.15,
                wordBreak: "break-word",
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 26,
                color: theme.inkSoft,
                marginTop: 20,
                lineHeight: 1.35,
              }}
            >
              {subtitle}
            </div>
            <div
              style={{
                fontSize: 22,
                color: theme.accent,
                marginTop: 36,
              }}
            >
              fractalsofyou.vercel.app
            </div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {seeds.map((seed) => (
              <ShapeSvg
                key={seed}
                seed={seed}
                size={seeds.length === 2 ? 340 : 500}
                stops={stops}
              />
            ))}
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          // Fully deterministic per query string, so let platforms cache hard.
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }
    );
  } catch (error) {
    console.error("OG image generation failed:", error);
    return new Response("Failed to generate the image", { status: 500 });
  }
}
