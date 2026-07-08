"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PaletteId,
  WORLD_THEMES,
  nearestMisses,
  shapeAddress,
  shapeDescription,
} from "@/lib/particles";
import StillShape from "@/components/StillShape";
import { useReducedMotion } from "@/components/useReducedMotion";

const SHAPE_SIZE = 200;

// The riffle is reframed as a narrated search: strangers one keystroke away
// flash past as "not this one", then it snaps to yours and the whole certificate
// types itself out, line by line, character by character. It HOLDS — no
// auto-close; the user leaves via Continue / tap / Esc. A tap mid-way reveals
// everything at once for the impatient.
const CANDIDATE_COUNT = 3;
const CANDIDATE_MS = 700; // each stranger held this long (readable)
const LAND_PAUSE_MS = 450; // beat on "— this one." before the typing starts
const TYPE_MS = 30; // per character
const LINE_PAUSE_MS = 220; // beat between lines
const FADE_MS = 350; // overlay fade-out before onDone

export default function RevealSequence({
  seed,
  palette,
  onDone,
}: {
  seed: string;
  palette: PaletteId;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const theme = WORLD_THEMES[palette];
  const address = shapeAddress(seed);

  // The certificate, typed out one line at a time.
  const lines = [
    `FORM No. ${address.catalog}`,
    `${address.coordinate} · in the space of all shapes`,
    shapeDescription(seed),
    "always here. you didn't make it — you found it.",
  ];
  const lineStyles: { className: string; color: string }[] = [
    { className: "font-mono text-sm tracking-wide", color: theme.ink },
    { className: "font-mono text-xs", color: theme.inkFaint },
    { className: "font-mono text-xs", color: theme.inkFaint },
    { className: "text-sm italic mt-1", color: theme.inkSoft },
  ];

  const candidates = useRef(nearestMisses(seed, CANDIDATE_COUNT)).current;

  // candidateIndex >= 0 → flashing strangers; < 0 → landed on yours.
  const [candidateIndex, setCandidateIndex] = useState(reduced ? -1 : 0);
  // progress.line = current line being typed; chars = chars shown of it.
  // line >= lines.length means fully typed.
  const [progress, setProgress] = useState(
    reduced ? { line: lines.length, chars: 0 } : { line: 0, chars: 0 }
  );
  const [visible, setVisible] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const closingRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearTimers();
    setVisible(false);
    setTimeout(() => onDoneRef.current(), FADE_MS);
  }, []);

  const revealFull = useCallback(() => {
    clearTimers();
    setCandidateIndex(-1);
    setProgress({ line: lines.length, chars: 0 });
  }, [lines.length]);

  useEffect(() => {
    const push = (delay: number, fn: () => void) =>
      timers.current.push(setTimeout(fn, delay));
    const raf = requestAnimationFrame(() => setVisible(true));

    if (!reduced) {
      for (let i = 1; i < candidates.length; i++) {
        push(CANDIDATE_MS * i, () => setCandidateIndex(i));
      }
      const landAt = CANDIDATE_MS * candidates.length;
      push(landAt, () => setCandidateIndex(-1));

      // Type each line in turn, character by character.
      let elapsed = LAND_PAUSE_MS;
      for (let i = 0; i < lines.length; i++) {
        const len = lines[i].length;
        if (i > 0) {
          const startAt = elapsed;
          push(landAt + startAt, () => setProgress({ line: i, chars: 0 }));
        }
        for (let c = 1; c <= len; c++) {
          const at = elapsed + c * TYPE_MS;
          push(landAt + at, () => setProgress({ line: i, chars: c }));
        }
        elapsed += len * TYPE_MS + LINE_PAUSE_MS;
      }
      push(landAt + elapsed, () => setProgress({ line: lines.length, chars: 0 }));
    }

    const scheduled = timers.current;
    return () => {
      cancelAnimationFrame(raf);
      scheduled.forEach(clearTimeout);
    };
    // Runs once per reveal; the overlay is keyed by nonce so a new find remounts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const landed = candidateIndex < 0;
  const typedDone = progress.line >= lines.length;
  const shownSeed = landed ? seed : candidates[candidateIndex] ?? seed;
  const shapeColor = landed ? theme.accent : theme.inkFaint;

  // First interaction reveals everything at once; once done, it closes.
  function handleOverlayClick() {
    if (!typedDone) revealFull();
    else close();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Finding your shape in the space of all shapes"
      onClick={handleOverlayClick}
      style={{ backgroundImage: theme.background }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 px-6 cursor-pointer transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <p
        className="font-mono text-xs uppercase tracking-[0.35em] transition-opacity duration-300"
        style={{ color: theme.inkFaint, opacity: landed ? 0 : 1 }}
      >
        searching a googol forms…
      </p>

      <StillShape
        seed={shownSeed}
        size={SHAPE_SIZE}
        color={shapeColor}
        className="transition-opacity duration-200"
      />

      {/* Fixed min-height so the shape doesn't drift as lines type in below it. */}
      <div className="min-h-[13rem] flex flex-col items-center justify-start gap-1.5 text-center">
        {!landed ? (
          <p className="text-sm italic" style={{ color: theme.inkSoft }}>
            not this one
          </p>
        ) : (
          <>
            <p className="text-base" style={{ color: theme.ink }}>
              — this one.
            </p>
            {lines.map((text, i) => {
              if (i > progress.line) return null;
              const shown = i < progress.line ? text : text.slice(0, progress.chars);
              const typing = i === progress.line && progress.chars < text.length;
              return (
                <p
                  key={i}
                  className={lineStyles[i].className}
                  style={{ color: lineStyles[i].color }}
                >
                  {shown}
                  {typing && <span className="opacity-50">|</span>}
                </p>
              );
            })}
            {typedDone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                }}
                style={{ backgroundColor: theme.accent, color: theme.accentInk }}
                className="mt-4 rounded-full px-6 py-2.5 text-sm font-medium active:scale-95 transition"
              >
                Continue →
              </button>
            )}
          </>
        )}
      </div>

      <p
        className="absolute bottom-8 text-xs transition-opacity duration-300"
        style={{ color: theme.inkFaint }}
      >
        {typedDone ? "tap anywhere, or press Esc, to close" : "tap to reveal your shape"}
      </p>
    </div>
  );
}
