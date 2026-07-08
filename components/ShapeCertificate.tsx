"use client";

import { useEffect, useRef, useState } from "react";
import {
  PaletteId,
  WORLD_THEMES,
  nearestMisses,
  shapeAddress,
  shapeHomePosition,
  textToPersonPattern,
} from "@/lib/particles";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ring-offset)]";

const MINI_SIZE = 66;
const MINI_MAX_DOTS = 160;
const MINI_DOT_RADIUS = 1;

// A still, single-colour rendering of a shape's resting curve — a "ghost" of
// a person you're not. Home positions only: no simulation, no animation loop.
function MiniShape({ seed, color }: { seed: string; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(MINI_SIZE * dpr);
    canvas.height = Math.round(MINI_SIZE * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, MINI_SIZE, MINI_SIZE);

    const pattern = textToPersonPattern(seed);
    const dots = Math.min(pattern.particleCount, MINI_MAX_DOTS);
    context.fillStyle = color;
    for (let i = 0; i < dots; i++) {
      const home = shapeHomePosition(i / dots, MINI_SIZE, pattern.shape);
      context.beginPath();
      context.arc(home.x, home.y, MINI_DOT_RADIUS, 0, Math.PI * 2);
      context.fill();
    }
  }, [seed, color]);

  return (
    <canvas
      ref={ref}
      width={MINI_SIZE}
      height={MINI_SIZE}
      style={{ width: MINI_SIZE, height: MINI_SIZE }}
      className="opacity-70"
    />
  );
}

function NearestMisses({ text, palette }: { text: string; palette: PaletteId }) {
  const [open, setOpen] = useState(false);
  const misses = open ? nearestMisses(text) : [];
  const ghost = WORLD_THEMES[palette].inkFaint;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`text-xs text-[color:var(--ink-faint)] hover:text-[color:var(--ink-soft)] transition-colors rounded px-1 ${FOCUS_RING}`}
      >
        {open ? "hide who you're not ↑" : "see who you're not →"}
      </button>
      {open && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {misses.map((miss) => (
              <figure key={miss} title={miss} className="leading-none">
                <MiniShape seed={miss} color={ghost} />
              </figure>
            ))}
          </div>
          <p className="text-xs italic text-[color:var(--ink-faint)] text-center">
            one keystroke away — and not one of them is you
          </p>
        </div>
      )}
    </div>
  );
}

const DEFAULT_FRAMING = "always here — you found this shape, you didn't make it";

// A googol (10^100) undersells it: the full pattern is 13 independent 32-bit
// coordinates, ~10^125 possibilities. Kept as a hover title so the headline
// line stays calm.
const SCALE_TITLE =
  "13 coordinates, 32 bits each — more possibilities than atoms in the observable universe";

/**
 * The "specimen card" shown under a generated shape: its permanent address in
 * the space of all shapes, plus the reveal that its neighbours are strangers.
 * `compact` drops everything but the two address lines (used in two-up compare,
 * where a full card per column would crowd the page).
 */
export default function ShapeCertificate({
  text,
  palette,
  compact = false,
  framing = DEFAULT_FRAMING,
}: {
  text: string;
  palette: PaletteId;
  compact?: boolean;
  framing?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const address = shapeAddress(text);

  return (
    <div
      className={`flex flex-col items-center gap-1.5 text-center transition-opacity duration-700 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="font-mono tracking-wide text-sm text-[color:var(--ink)]">
        FORM No. {address.catalog}
      </div>
      <div className="font-mono text-xs text-[color:var(--ink-faint)]">
        {address.coordinate} · in the space of all shapes
      </div>

      {!compact && (
        <>
          <p className="text-xs italic text-[color:var(--ink-soft)] mt-1 max-w-xs">
            {framing}
          </p>
          <p
            title={SCALE_TITLE}
            className="text-xs text-[color:var(--ink-faint)] cursor-help"
          >
            one of more than a googol possible forms
          </p>
          <div className="mt-1">
            <NearestMisses text={text} palette={palette} />
          </div>
        </>
      )}
    </div>
  );
}
