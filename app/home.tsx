"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ParticleCanvas from "@/components/ParticleCanvas";
import ShapeCertificate from "@/components/ShapeCertificate";
import RevealSequence from "@/components/RevealSequence";
import {
  WallpaperItem,
  downloadBlob,
  renderWallpaperPng,
} from "@/components/exportImage";
import { useReducedMotion } from "@/components/useReducedMotion";
import {
  PALETTES,
  PALETTE_LABELS,
  PaletteId,
  PersonPattern,
  WORLD_THEMES,
  compatibilityScore,
  hashUnit,
  textToPersonPattern,
} from "@/lib/particles";
import { onThisDay } from "@/lib/onThisDay";
import { playBurstChime, playEnableChime, type BurstKind } from "@/components/sound";

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

function DiceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="8.5" r="1.6" />
      <circle cx="15.5" cy="8.5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="8.5" cy="15.5" r="1.6" />
      <circle cx="15.5" cy="15.5" r="1.6" />
    </svg>
  );
}

function SoundOnIcon({ className }: { className?: string }) {
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
      <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function SoundOffIcon({ className }: { className?: string }) {
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
      <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
      <path d="m16 9 6 6" />
      <path d="m22 9-6 6" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
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
      <path d="m22 8-6 4 6 4V8Z" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
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

const DEMO_CYCLE_MS = 4000;

interface DemoItem {
  text: string; // seed rendered as a drifting shape
  label: string; // small caption naming what it is
}

const DEMO_PROMPT: DemoItem = { text: "type your name", label: "↑ now, yours" };

// First render (static shell + first client paint) shows this date-free set, so
// server and client match; the real, date-derived items load in an effect.
const DEMO_FALLBACK: DemoItem[] = [{ text: "hello", label: "already here" }, DEMO_PROMPT];

// Before you type anything, the space drifts through things that already exist
// in it — today, a moment from history, the year — each as its own shape. The
// point: the space was full long before you arrived.
function buildDemoItems(now: Date): DemoItem[] {
  const items: DemoItem[] = [
    { text: now.toLocaleDateString(undefined, { month: "long", day: "numeric" }), label: "today" },
  ];
  const event = onThisDay(now.getMonth() + 1, now.getDate());
  if (event) items.push({ text: event.text, label: `on this day, ${event.year}` });
  items.push({ text: String(now.getFullYear()), label: "the year" });
  items.push(DEMO_PROMPT);
  return items;
}

// Curated seeds for the dice button — evocative little phrases that make
// better shapes-with-a-story than a random string would.
const SURPRISE_WORDS = [
  "monsoon",
  "first coffee",
  "3am",
  "grandma's kitchen",
  "petrichor",
  "midnight train",
  "old bookstore",
  "paper boats",
  "the sea at night",
  "summer 2009",
  "chai in the rain",
  "city lights",
  "half-remembered dream",
  "long drive home",
  "borrowed sweater",
  "last day of school",
];

function AmbientDemo({ palette, size }: { palette: PaletteId; size: number }) {
  const reducedMotion = useReducedMotion();
  const [items, setItems] = useState<DemoItem[]>(DEMO_FALLBACK);
  const [index, setIndex] = useState(0);

  // Date-derived items only after mount, so the statically prerendered shell and
  // the first client render agree (no hydration mismatch).
  useEffect(() => {
    setItems(buildDemoItems(new Date()));
  }, []);

  // Under prefers-reduced-motion the demo holds its first shape instead of
  // cycling — the morphing is exactly the kind of unrequested motion that
  // setting asks us to skip.
  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setIndex((i) => i + 1), DEMO_CYCLE_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  const item = items[index % items.length];
  const pattern = useMemo(() => textToPersonPattern(item.text), [item.text]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-center text-[color:var(--ink-faint)] transition-colors duration-500 min-h-[1.25rem]">
        <span className="text-[color:var(--ink-soft)]">{item.text}</span>
        {item.label && <span> · {item.label}</span>}
      </p>
      <ParticleCanvas
        pattern={pattern}
        palette={palette}
        size={size}
        label={`A drifting shape for "${item.text}" — type above to make your own`}
      />
    </div>
  );
}

function PersonFractal({
  placeholder,
  palette,
  committed,
  onCommit,
  soundOn = false,
  size = 560,
  registerCanvas,
  certificateMode = "none",
  onFind,
}: {
  placeholder: string;
  palette: PaletteId;
  committed: string | null;
  onCommit: (value: string) => void;
  soundOn?: boolean;
  size?: number;
  registerCanvas?: (canvas: HTMLCanvasElement | null) => void;
  certificateMode?: "full" | "compact" | "none";
  /** Fires the narrated reveal for a fresh find (dice/Enter/button); not on URL restore. */
  onFind?: (seed: string) => void;
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
    const value = text.trim() || "anonymous";
    onFind?.(value);
    onCommit(value);
  }

  function handleSurprise() {
    const options = SURPRISE_WORDS.filter((w) => w !== committed);
    const word = options[Math.floor(Math.random() * options.length)];
    setText(word);
    onFind?.(word);
    onCommit(word);
  }

  const handleBurst =
    soundOn && committed
      ? (kind: BurstKind) => playBurstChime(kind, hashUnit(committed, "pitch"))
      : undefined;

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
          Find yours
        </button>
        <button
          onClick={handleSurprise}
          aria-label="Surprise me with a random seed"
          title="Surprise me"
          className={`inline-flex items-center justify-center bg-[color:var(--surface)] border border-[color:var(--border)] hover:border-[color:var(--ink-faint)] active:scale-95 transition text-[color:var(--ink-soft)] rounded-lg shadow-sm p-3 ${FOCUS_RING}`}
        >
          <DiceIcon className="w-5 h-5" />
        </button>
      </div>

      {/* The reveal (played over the page) delivers the address as a moment;
          this persistent card sits above the shape as its reference copy. */}
      {committed && certificateMode !== "none" && (
        <ShapeCertificate
          text={committed}
          palette={palette}
          compact={certificateMode === "compact"}
        />
      )}

      {pattern ? (
        <ParticleCanvas
          pattern={pattern}
          palette={palette}
          size={responsiveSize}
          label={`A one-of-a-kind particle shape generated from "${committed}"`}
          hint="drag to scatter · hold to gather · double-tap to burst"
          onBurst={handleBurst}
          registerCanvas={registerCanvas}
        />
      ) : (
        <AmbientDemo palette={palette} size={responsiveSize} />
      )}
    </div>
  );
}

function BlendView({
  a,
  b,
  palette,
  soundOn,
  registerCanvas,
}: {
  a: string;
  b: string;
  palette: PaletteId;
  soundOn: boolean;
  registerCanvas?: (canvas: HTMLCanvasElement | null) => void;
}) {
  const responsiveSize = useResponsiveSize(560);
  const seed = `${a} ${b}`;
  const pattern = useMemo(() => textToPersonPattern(seed), [seed]);
  const handleBurst = soundOn
    ? (kind: BurstKind) => playBurstChime(kind, hashUnit(seed, "pitch"))
    : undefined;

  return (
    <div className="flex flex-col items-center gap-4">
      <ShapeCertificate
        text={seed}
        palette={palette}
        framing="a form that is neither of you — only here when you're together"
      />
      <ParticleCanvas
        pattern={pattern}
        palette={palette}
        size={responsiveSize}
        label={`A blended particle shape generated from "${a}" and "${b}"`}
        hint="two of you, one shape"
        onBurst={handleBurst}
        registerCanvas={registerCanvas}
      />
    </div>
  );
}

function compatibilityLabel(score: number): string {
  if (score < 20) return "parallel universes";
  if (score < 40) return "friendly orbits";
  if (score < 60) return "gravitational pull";
  if (score < 80) return "cosmic overlap";
  return "written in the stars";
}

function CompatibilityMeter({ a, b }: { a: string; b: string }) {
  const score = compatibilityScore(a, b);
  return (
    <p className="text-sm italic text-[color:var(--ink-soft)] transition-colors duration-700 text-center">
      &#10024; {compatibilityLabel(score)}: {score}%
      <span className="block not-italic text-xs text-[color:var(--ink-faint)] mt-1">
        (measured by an extremely serious cosmic instrument)
      </span>
    </p>
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

function DownloadPngButton({
  palette,
  items,
}: {
  palette: PaletteId;
  items: WallpaperItem[];
}) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    if (busy || items.length === 0) return;
    setBusy(true);
    try {
      const blob = await renderWallpaperPng(palette, items);
      downloadBlob(blob, "fractals-of-you.png");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      className={`inline-flex items-center gap-2 bg-[color:var(--surface)] backdrop-blur-sm border border-[color:var(--border)] shadow-sm hover:border-[color:var(--ink-faint)] active:scale-95 transition rounded-full px-5 py-3 text-sm font-medium text-[color:var(--ink-soft)] disabled:opacity-60 ${FOCUS_RING}`}
    >
      <DownloadIcon className="w-4 h-4" />
      {busy ? "Rendering…" : "Download PNG"}
    </button>
  );
}

// 3 seconds is enough for a full scatter-and-reform loop without producing a
// file too large to casually share.
const RECORD_MS = 3000;

function RecordClipButton({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  // MediaRecorder + canvas.captureStream + webm isn't universal (Safari
  // varies), so the button only exists where the whole pipeline works.
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(
      typeof MediaRecorder !== "undefined" &&
        typeof HTMLCanvasElement.prototype.captureStream === "function" &&
        MediaRecorder.isTypeSupported("video/webm")
    );
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    };
  }, []);

  function handleRecord() {
    const canvas = canvasRef.current;
    if (!canvas || recording) return;
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      downloadBlob(new Blob(chunks, { type: "video/webm" }), "fractals-of-you.webm");
      setRecording(false);
    };
    recorder.start();
    setRecording(true);
    timeoutRef.current = setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, RECORD_MS);
  }

  if (!supported) return null;

  return (
    <button
      onClick={handleRecord}
      disabled={recording}
      className={`inline-flex items-center gap-2 bg-[color:var(--surface)] backdrop-blur-sm border border-[color:var(--border)] shadow-sm hover:border-[color:var(--ink-faint)] active:scale-95 transition rounded-full px-5 py-3 text-sm font-medium text-[color:var(--ink-soft)] disabled:opacity-60 ${FOCUS_RING}`}
    >
      {recording ? (
        <>
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
          Recording…
        </>
      ) : (
        <>
          <VideoIcon className="w-4 h-4" />
          Record 3s clip
        </>
      )}
    </button>
  );
}

const DEFAULT_PALETTE: PaletteId = "sunrise";

/** Query-param names for shareable URLs: a/b = the two texts, m = mode, p = palette, v=blend. */
function buildShareQuery(
  mode: Mode,
  palette: PaletteId,
  committedA: string | null,
  committedB: string | null,
  blend: boolean
): string {
  const params = new URLSearchParams();
  if (committedA) params.set("a", committedA);
  if (mode === "compare") {
    params.set("m", "compare");
    if (committedB) params.set("b", committedB);
    if (blend && committedA && committedB) params.set("v", "blend");
  }
  if (palette !== DEFAULT_PALETTE) params.set("p", palette);
  return params.toString();
}

const SOUND_STORAGE_KEY = "fractals-sound";

export default function Home() {
  const [mode, setMode] = useState<Mode>("single");
  const [palette, setPalette] = useState<PaletteId>("sunrise");
  const [committedA, setCommittedA] = useState<string | null>(null);
  const [committedB, setCommittedB] = useState<string | null>(null);
  const [blend, setBlend] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const urlSyncedOnceRef = useRef(false);

  // The narrated reveal that plays over the page on a fresh find. The nonce
  // keys the overlay so re-finding (or a dice roll) restarts it cleanly.
  const [reveal, setReveal] = useState<{ seed: string; nonce: number } | null>(null);
  const revealNonce = useRef(0);
  const startReveal = useCallback((seed: string) => {
    revealNonce.current += 1;
    setReveal({ seed, nonce: revealNonce.current });
  }, []);

  // Whichever canvas is currently "the" shape registers itself here so the
  // record-clip button can capture its live stream.
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const registerCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    recordCanvasRef.current = canvas;
  }, []);

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
    if (params.get("v") === "blend") setBlend(true);
  }, []);

  // Sound preference lives in localStorage, deliberately not in share URLs —
  // nobody should get surprise audio from a link.
  useEffect(() => {
    if (localStorage.getItem(SOUND_STORAGE_KEY) === "1") setSoundOn(true);
  }, []);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_STORAGE_KEY, next ? "1" : "0");
    // Instant proof the speakers work — and it primes the AudioContext
    // inside this click's user gesture.
    if (next) playEnableChime();
  }

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
    const query = buildShareQuery(mode, palette, committedA, committedB, blend);
    window.history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname
    );
  }, [mode, palette, committedA, committedB, blend]);

  const hasPattern =
    mode === "single" ? committedA !== null : committedA !== null || committedB !== null;

  // What the PNG download renders: one shape, two stacked, or the blend.
  const wallpaperItems: WallpaperItem[] = [];
  if (mode === "single") {
    if (committedA) wallpaperItems.push({ seed: committedA, caption: committedA });
  } else if (blend && committedA && committedB) {
    wallpaperItems.push({
      seed: `${committedA} ${committedB}`,
      caption: `${committedA} × ${committedB}`,
    });
  } else {
    if (committedA) wallpaperItems.push({ seed: committedA, caption: committedA });
    if (committedB) wallpaperItems.push({ seed: committedB, caption: committedB });
  }

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
          Type anything. Somewhere in a space larger than the universe, one
          shape was already yours &mdash; this finds it.
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

      <div className="flex items-center gap-3">
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
      <button
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? "Turn sound effects off" : "Turn sound effects on"}
        title="Sound effects on bursts (off by default)"
        className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm bg-[color:var(--surface)] backdrop-blur-sm border border-[color:var(--border)] shadow-sm hover:border-[color:var(--ink-faint)] active:scale-95 transition ${FOCUS_RING} ${
          soundOn ? "text-[color:var(--ink)]" : "text-[color:var(--ink-faint)]"
        }`}
      >
        {soundOn ? <SoundOnIcon className="w-5 h-5" /> : <SoundOffIcon className="w-5 h-5" />}
        {soundOn ? "Sound on" : "Sound off"}
      </button>
      </div>

      {mode === "single" ? (
        <PersonFractal
          placeholder="your name, a memory, a birthday..."
          palette={palette}
          committed={committedA}
          onCommit={setCommittedA}
          soundOn={soundOn}
          registerCanvas={registerCanvas}
          certificateMode="full"
          onFind={startReveal}
        />
      ) : (
        <div className="flex flex-col items-center gap-6">
          {blend && committedA && committedB ? (
            <BlendView
              a={committedA}
              b={committedB}
              palette={palette}
              soundOn={soundOn}
              registerCanvas={registerCanvas}
            />
          ) : (
            <div className="flex flex-col md:flex-row gap-10 items-start justify-center">
              <PersonFractal
                placeholder="first person's name..."
                palette={palette}
                committed={committedA}
                onCommit={setCommittedA}
                soundOn={soundOn}
                size={400}
                registerCanvas={committedA ? registerCanvas : undefined}
                certificateMode="compact"
                onFind={startReveal}
              />
              <PersonFractal
                placeholder="second person's name..."
                palette={palette}
                committed={committedB}
                onCommit={setCommittedB}
                soundOn={soundOn}
                size={400}
                registerCanvas={!committedA && committedB ? registerCanvas : undefined}
                certificateMode="compact"
                onFind={startReveal}
              />
            </div>
          )}
          {committedA && committedB && (
            <button
              onClick={() => setBlend(!blend)}
              className={`inline-flex items-center gap-1.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] active:scale-95 transition text-[color:var(--accent-ink)] rounded-full shadow-sm shadow-black/10 px-5 py-3 text-sm font-medium ${FOCUS_RING}`}
            >
              {blend ? (
                <>
                  <CompareIcon className="w-4 h-4" />
                  Split apart
                </>
              ) : (
                <>
                  <SparkleIcon className="w-4 h-4" />
                  Blend into one
                </>
              )}
            </button>
          )}
          {committedA && committedB && (
            <CompatibilityMeter a={committedA} b={committedB} />
          )}
        </div>
      )}

      {hasPattern && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ShareLinkButton />
          <DownloadPngButton palette={palette} items={wallpaperItems} />
          <RecordClipButton canvasRef={recordCanvasRef} />
        </div>
      )}

      <footer className="mt-auto text-xs text-[color:var(--ink-faint)] transition-colors duration-700">
        Everything runs in your browser; nothing is sent anywhere.
      </footer>

      {reveal && (
        <RevealSequence
          key={reveal.nonce}
          seed={reveal.seed}
          palette={palette}
          onDone={() => setReveal(null)}
        />
      )}
    </main>
  );
}
