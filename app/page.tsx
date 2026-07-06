"use client";

import { useEffect, useState } from "react";
import ParticleCanvas from "@/components/ParticleCanvas";
import {
  PALETTES,
  PALETTE_LABELS,
  PaletteId,
  PersonPattern,
  textToPersonPattern,
} from "@/lib/particles";

type Mode = "single" | "compare";

function paletteGradient(stops: [number, number, number][]): string {
  const n = stops.length;
  const stopsCss = stops
    .map((s, i) => `rgb(${s[0]},${s[1]},${s[2]}) ${(i / (n - 1)) * 100}%`)
    .join(", ");
  return `linear-gradient(90deg, ${stopsCss})`;
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2c.4 3.6 1.4 6.2 3 7.8 1.6 1.6 4.2 2.6 7.8 3-3.6.4-6.2 1.4-7.8 3-1.6 1.6-2.6 4.2-3 7.8-.4-3.6-1.4-6.2-3-7.8-1.6-1.6-4.2-2.6-7.8-3 3.6-.4 6.2-1.4 7.8-3 1.6-1.6 2.6-4.2 3-7.8z" />
    </svg>
  );
}

function SingleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="5.5" fill="currentColor" />
    </svg>
  );
}

function CompareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="9" cy="12" r="5.5" fill="currentColor" opacity="0.9" />
      <circle cx="15" cy="12" r="5.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf2]";

const VIEWPORT_PADDING = 48;
const MIN_CANVAS_SIZE = 220;

// The canvas draws at a fixed pixel resolution (used for both rendering and
// the particle physics' coordinate space), so it can't just be shrunk with
// CSS without breaking the cursor-to-particle mapping. Instead we compute an
// actual smaller pixel size once the viewport is known to be narrower than
// the preferred size, so it never overflows on mobile.
function useResponsiveSize(preferred: number): number {
  const [size, setSize] = useState(preferred);

  useEffect(() => {
    function update() {
      const available = window.innerWidth - VIEWPORT_PADDING;
      setSize(Math.max(MIN_CANVAS_SIZE, Math.min(preferred, available)));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [preferred]);

  return size;
}

function PersonFractal({
  placeholder,
  palette,
  size = 560,
}: {
  placeholder: string;
  palette: PaletteId;
  size?: number;
}) {
  const [text, setText] = useState("");
  const [pattern, setPattern] = useState<PersonPattern | null>(null);
  const [committedText, setCommittedText] = useState<string | null>(null);
  const responsiveSize = useResponsiveSize(size);

  function handleGenerate() {
    const value = text.trim() || "anonymous";
    setPattern(textToPersonPattern(value));
    setCommittedText(value);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap gap-3 items-center justify-center">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder={placeholder}
          maxLength={64}
          aria-label="Your name, a memory, or anything else"
          className={`bg-white/70 border border-stone-300 rounded-lg shadow-sm px-3 py-3 text-base sm:text-sm w-56 text-stone-800 placeholder:text-stone-400 transition-colors focus:border-orange-400 ${FOCUS_RING}`}
        />
        <button
          onClick={handleGenerate}
          className={`inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 active:scale-95 transition text-white rounded-lg shadow-sm shadow-orange-900/20 px-4 py-3 text-sm font-medium ${FOCUS_RING}`}
        >
          <SparkleIcon className="w-4 h-4" />
          Generate
        </button>
      </div>

      {committedText && pattern && (
        <p className="text-sm text-stone-600 text-center max-w-xs">
          &ldquo;{committedText}&rdquo; &mdash; scatter it with your cursor, it finds its way back
        </p>
      )}

      {pattern ? (
        <ParticleCanvas
          pattern={pattern}
          palette={palette}
          size={responsiveSize}
          label={`A one-of-a-kind particle shape generated from "${committedText}"`}
        />
      ) : (
        <div
          style={{ width: responsiveSize, height: responsiveSize }}
          className="rounded-2xl bg-white/40 backdrop-blur-sm border border-stone-300 shadow-sm flex flex-col items-center justify-center gap-3 text-stone-500 text-sm text-center px-4"
        >
          <SparkleIcon className="w-7 h-7 text-stone-400" />
          <span>Enter something above to generate</span>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("single");
  const [palette, setPalette] = useState<PaletteId>("sunrise");

  return (
    <main
      style={{
        backgroundImage:
          "radial-gradient(1100px 550px at 50% -8%, rgba(255,180,110,0.35), transparent 60%), linear-gradient(to bottom, #fffaf2, #ffedd9 45%, #ffd9ad)",
      }}
      className="min-h-screen text-stone-800 flex flex-col items-center gap-10 px-6 py-12 sm:py-16"
    >
      <div className="text-center space-y-3 max-w-xl">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900">
          Fractals of You
        </h1>
        <p className="text-stone-600 leading-relaxed">
          Type your name, birthday, or anything else. It becomes a shape made
          of particles that belongs only to you. Wave your cursor over it or
          click to scatter it, and it drifts back to reform. Everything runs
          in your browser; nothing is sent anywhere.
        </p>
      </div>

      <div
        role="group"
        aria-label="Display mode"
        className="flex gap-2 rounded-full bg-white/60 backdrop-blur-sm border border-stone-300 shadow-sm p-1"
      >
        <button
          onClick={() => setMode("single")}
          aria-pressed={mode === "single"}
          className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-full text-sm transition active:scale-95 ${FOCUS_RING} ${
            mode === "single"
              ? "bg-orange-600 text-white"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <SingleIcon className="w-4 h-4" />
          Single
        </button>
        <button
          onClick={() => setMode("compare")}
          aria-pressed={mode === "compare"}
          className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-full text-sm transition active:scale-95 ${FOCUS_RING} ${
            mode === "compare"
              ? "bg-orange-600 text-white"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <CompareIcon className="w-4 h-4" />
          Compare two people
        </button>
      </div>

      <div
        role="group"
        aria-label="Color palette"
        className="flex gap-4 items-start bg-white/60 backdrop-blur-sm border border-stone-300 shadow-sm rounded-2xl px-5 py-3"
      >
        {(Object.keys(PALETTES) as PaletteId[]).map((id) => (
          <button
            key={id}
            onClick={() => setPalette(id)}
            aria-pressed={palette === id}
            aria-label={PALETTE_LABELS[id]}
            className={`flex flex-col items-center gap-1 group rounded-lg p-1 active:scale-95 transition ${FOCUS_RING}`}
          >
            <span
              style={{ backgroundImage: paletteGradient(PALETTES[id]) }}
              className={`w-12 h-6 rounded-full border-2 transition ${
                palette === id
                  ? "border-stone-800"
                  : "border-transparent group-hover:border-stone-400"
              }`}
            />
            <span
              className={`text-xs ${
                palette === id
                  ? "text-stone-800 font-medium"
                  : "text-stone-500"
              }`}
            >
              {PALETTE_LABELS[id]}
            </span>
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <PersonFractal placeholder="your name, a memory, a birthday..." palette={palette} />
      ) : (
        <div className="flex flex-col md:flex-row gap-10 items-start justify-center">
          <PersonFractal
            placeholder="first person's name..."
            palette={palette}
            size={400}
          />
          <PersonFractal
            placeholder="second person's name..."
            palette={palette}
            size={400}
          />
        </div>
      )}
    </main>
  );
}
