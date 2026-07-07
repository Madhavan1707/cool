"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ParticleCanvas from "@/components/ParticleCanvas";
import { useReducedMotion } from "@/components/useReducedMotion";
import {
  PALETTES,
  PALETTE_LABELS,
  PaletteId,
  PersonPattern,
  WORLD_THEMES,
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

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// Colors come from CSS variables set on <main> from the active WorldTheme,
// so every control follows the selected palette.
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ring-offset)]";

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

// Words the empty state drifts through before the user types anything, so
// first paint is already alive instead of a dead placeholder box.
const DEMO_WORDS = ["hello", "you?", "type your name…"];
const DEMO_CYCLE_MS = 4000;

function AmbientDemo({ palette, size }: { palette: PaletteId; size: number }) {
  const reducedMotion = useReducedMotion();
  const [wordIndex, setWordIndex] = useState(0);

  // Under prefers-reduced-motion the demo holds its first shape instead of
  // cycling — the morphing between words is exactly the kind of unrequested
  // motion that setting asks us to skip.
  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(
      () => setWordIndex((i) => (i + 1) % DEMO_WORDS.length),
      DEMO_CYCLE_MS
    );
    return () => clearInterval(id);
  }, [reducedMotion]);

  const pattern = useMemo(() => textToPersonPattern(DEMO_WORDS[wordIndex]), [wordIndex]);

  return (
    <ParticleCanvas
      pattern={pattern}
      palette={palette}
      size={size}
      label="A drifting demo shape — generate your own by typing above"
    />
  );
}

function PersonFractal({
  placeholder,
  palette,
  committed,
  onCommit,
  size = 560,
}: {
  placeholder: string;
  palette: PaletteId;
  committed: string | null;
  onCommit: (value: string) => void;
  size?: number;
}) {
  const [text, setText] = useState(committed ?? "");
  const responsiveSize = useResponsiveSize(size);

  const pattern = useMemo<PersonPattern | null>(
    () => (committed ? textToPersonPattern(committed) : null),
    [committed]
  );

  // Keep the input in step when the committed text arrives from outside the
  // component — restored from the URL on load, or remembered across a
  // single/compare mode switch.
  useEffect(() => {
    if (committed !== null) setText(committed);
  }, [committed]);

  function handleGenerate() {
    onCommit(text.trim() || "anonymous");
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
          className={`bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg shadow-sm px-3 py-3 text-base sm:text-sm w-56 text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] transition-colors focus:border-[color:var(--accent)] ${FOCUS_RING}`}
        />
        <button
          onClick={handleGenerate}
          className={`inline-flex items-center gap-1.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] active:scale-95 transition text-[color:var(--accent-ink)] rounded-lg shadow-sm shadow-black/10 px-4 py-3 text-sm font-medium ${FOCUS_RING}`}
        >
          <SparkleIcon className="w-4 h-4" />
          Generate
        </button>
      </div>

      {committed && pattern && (
        <p className="text-sm text-[color:var(--ink-soft)] transition-colors duration-700 text-center max-w-xs">
          &ldquo;{committed}&rdquo; &mdash; scatter it with your cursor, it finds its way back
        </p>
      )}

      {pattern ? (
        <ParticleCanvas
          pattern={pattern}
          palette={palette}
          size={responsiveSize}
          label={`A one-of-a-kind particle shape generated from "${committed}"`}
        />
      ) : (
        <AmbientDemo palette={palette} size={responsiveSize} />
      )}
    </div>
  );
}

const COPIED_FEEDBACK_MS = 2000;

function ShareLinkButton() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context); fall back
      // to the legacy selection-based copy.
      const textarea = document.createElement("textarea");
      textarea.value = window.location.href;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 bg-[color:var(--surface)] backdrop-blur-sm border border-[color:var(--border)] shadow-sm hover:border-[color:var(--ink-faint)] active:scale-95 transition rounded-full px-5 py-3 text-sm font-medium text-[color:var(--ink-soft)] ${FOCUS_RING}`}
    >
      {copied ? (
        <>
          <CheckIcon className="w-4 h-4 text-green-600" />
          Link copied
        </>
      ) : (
        <>
          <LinkIcon className="w-4 h-4" />
          Copy shareable link
        </>
      )}
    </button>
  );
}

const DEFAULT_PALETTE: PaletteId = "sunrise";

/** Query-param names for shareable URLs: a/b = the two texts, m = mode, p = palette. */
function buildShareQuery(
  mode: Mode,
  palette: PaletteId,
  committedA: string | null,
  committedB: string | null
): string {
  const params = new URLSearchParams();
  if (committedA) params.set("a", committedA);
  if (mode === "compare") {
    params.set("m", "compare");
    if (committedB) params.set("b", committedB);
  }
  if (palette !== DEFAULT_PALETTE) params.set("p", palette);
  return params.toString();
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("single");
  const [palette, setPalette] = useState<PaletteId>("sunrise");
  const [committedA, setCommittedA] = useState<string | null>(null);
  const [committedB, setCommittedB] = useState<string | null>(null);
  const urlSyncedOnceRef = useRef(false);

  // Restore state from the URL after mount. The page is statically
  // prerendered with default state, so reading location in an effect (rather
  // than in the initial render) avoids a hydration mismatch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("p");
    if (p && p in PALETTES) setPalette(p as PaletteId);
    const a = params.get("a");
    if (a) setCommittedA(a.slice(0, 64));
    const b = params.get("b");
    if (b) setCommittedB(b.slice(0, 64));
    if (params.get("m") === "compare" || b) setMode("compare");
  }, []);

  // Mirror state into the URL so the address bar is always shareable.
  // replaceState (not pushState) so browsing history isn't spammed; Next.js
  // integrates native history calls with its router.
  useEffect(() => {
    // The first run happens in the same commit as the restore effect above,
    // before restored state has rendered — writing now would erase the very
    // params being restored.
    if (!urlSyncedOnceRef.current) {
      urlSyncedOnceRef.current = true;
      return;
    }
    const query = buildShareQuery(mode, palette, committedA, committedB);
    window.history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname
    );
  }, [mode, palette, committedA, committedB]);

  const hasPattern =
    mode === "single" ? committedA !== null : committedA !== null || committedB !== null;

  const theme = WORLD_THEMES[palette];
  const themeVars = {
    "--ink": theme.ink,
    "--ink-soft": theme.inkSoft,
    "--ink-faint": theme.inkFaint,
    "--accent": theme.accent,
    "--accent-hover": theme.accentHover,
    "--accent-ink": theme.accentInk,
    "--surface": theme.surface,
    "--border": theme.border,
    "--ring-offset": theme.ringOffset,
  } as React.CSSProperties;

  return (
    <main
      style={themeVars}
      className="relative min-h-screen text-[color:var(--ink)] transition-colors duration-700 flex flex-col items-center gap-10 px-6 py-12 sm:py-16"
    >
      {/* One fixed layer per palette; gradients can't transition, so the
          world switch is an opacity cross-fade between prebuilt layers. */}
      {(Object.keys(WORLD_THEMES) as PaletteId[]).map((id) => (
        <div
          key={id}
          aria-hidden
          style={{ backgroundImage: WORLD_THEMES[id].background }}
          className={`fixed inset-0 -z-10 transition-opacity duration-700 ${
            palette === id ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      <div className="text-center space-y-3 max-w-xl">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[color:var(--ink)] transition-colors duration-700">
          Fractals of You
        </h1>
        <p className="text-[color:var(--ink-soft)] transition-colors duration-700 leading-relaxed">
          Type your name, birthday, or anything else. It becomes a shape made
          of particles that belongs only to you. Wave your cursor over it or
          click to scatter it, and it drifts back to reform. Everything runs
          in your browser; nothing is sent anywhere.
        </p>
      </div>

      <div
        role="group"
        aria-label="Display mode"
        className="flex gap-2 rounded-full bg-[color:var(--surface)] backdrop-blur-sm border border-[color:var(--border)] shadow-sm p-1 transition-colors duration-700"
      >
        <button
          onClick={() => setMode("single")}
          aria-pressed={mode === "single"}
          className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-full text-sm transition active:scale-95 ${FOCUS_RING} ${
            mode === "single"
              ? "bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
              : "text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
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
              ? "bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
              : "text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
          }`}
        >
          <CompareIcon className="w-4 h-4" />
          Compare two people
        </button>
      </div>

      <div
        role="group"
        aria-label="Color palette"
        className="flex gap-4 items-start bg-[color:var(--surface)] backdrop-blur-sm border border-[color:var(--border)] shadow-sm rounded-2xl px-5 py-3 transition-colors duration-700"
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
                  ? "border-[color:var(--ink)]"
                  : "border-transparent group-hover:border-[color:var(--ink-faint)]"
              }`}
            />
            <span
              className={`text-xs transition-colors duration-700 ${
                palette === id
                  ? "text-[color:var(--ink)] font-medium"
                  : "text-[color:var(--ink-soft)]"
              }`}
            >
              {PALETTE_LABELS[id]}
            </span>
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <PersonFractal
          placeholder="your name, a memory, a birthday..."
          palette={palette}
          committed={committedA}
          onCommit={setCommittedA}
        />
      ) : (
        <div className="flex flex-col md:flex-row gap-10 items-start justify-center">
          <PersonFractal
            placeholder="first person's name..."
            palette={palette}
            committed={committedA}
            onCommit={setCommittedA}
            size={400}
          />
          <PersonFractal
            placeholder="second person's name..."
            palette={palette}
            committed={committedB}
            onCommit={setCommittedB}
            size={400}
          />
        </div>
      )}

      {hasPattern && <ShareLinkButton />}
    </main>
  );
}
