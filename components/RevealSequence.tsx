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

// The riffle is reframed as a narrated search: a few strangers one keystroke
// away flash past as "not this one", then it snaps to yours and the address
// writes out. Paced slowly enough to read (~5s to fully unfold), then it HOLDS
// — the reveal never closes itself; the user taps / clicks Continue / hits Esc.
// A tap during the search jumps straight to the answer for the impatient.
const CANDIDATE_COUNT = 4;
const CANDIDATE_MS = 800; // each stranger held this long (readable)
const LAND_PAUSE_MS = 500; // beat on "— this one." before the address types
const TYPE_MS = 55; // per character of the catalog line
const MESSAGE_DELAY_MS = 250; // after the catalog finishes, reveal the rest
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
  const catalogLine = `FORM No. ${address.catalog}`;
  const structure = shapeDescription(seed);

  // A few real one-keystroke neighbours to flash as rejected candidates.
  const candidates = useRef(nearestMisses(seed, CANDIDATE_COUNT)).current;

  // candidateIndex >= 0 → still flashing strangers; < 0 → landed on yours.
  const [candidateIndex, setCandidateIndex] = useState(reduced ? -1 : 0);
  const [typed, setTyped] = useState(reduced ? catalogLine.length : 0);
  const [showMessage, setShowMessage] = useState(reduced);
  const [visible, setVisible] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const closingRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Fade out, then hand back to the parent. Guarded so repeated taps are safe.
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearTimers();
    setVisible(false);
    setTimeout(() => onDoneRef.current(), FADE_MS);
  }, []);

  // Jump straight to the fully-revealed answer (tap during search / reduced motion).
  const revealFull = useCallback(() => {
    clearTimers();
    setCandidateIndex(-1);
    setTyped(catalogLine.length);
    setShowMessage(true);
  }, [catalogLine.length]);

  useEffect(() => {
    const push = (delay: number, fn: () => void) =>
      timers.current.push(setTimeout(fn, delay));

    const raf = requestAnimationFrame(() => setVisible(true));

    // Reduced motion: the statement is already shown (initial state); just hold.
    if (!reduced) {
      for (let i = 1; i < candidates.length; i++) {
        push(CANDIDATE_MS * i, () => setCandidateIndex(i));
      }
      const landAt = CANDIDATE_MS * candidates.length;
      push(landAt, () => setCandidateIndex(-1));

      const typeStart = landAt + LAND_PAUSE_MS;
      for (let c = 1; c <= catalogLine.length; c++) {
        push(typeStart + c * TYPE_MS, () => setTyped(c));
      }
      const typeEnd = typeStart + catalogLine.length * TYPE_MS;
      push(typeEnd + MESSAGE_DELAY_MS, () => setShowMessage(true));
      // Deliberately no close timer — the reveal holds until the user leaves.
    }

    const scheduled = timers.current;
    return () => {
      cancelAnimationFrame(raf);
      scheduled.forEach(clearTimeout);
    };
    // Runs once per reveal; the overlay is keyed by nonce so a new find remounts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc always closes, even mid-search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const landed = candidateIndex < 0;
  const shownSeed = landed ? seed : candidates[candidateIndex] ?? seed;
  const shapeColor = landed ? theme.accent : theme.inkFaint;

  // First interaction reveals the answer; once shown, it closes.
  function handleOverlayClick() {
    if (!showMessage) revealFull();
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

      {/* Fixed height so the shape doesn't jump as lines appear below it. */}
      <div className="h-32 flex flex-col items-center justify-start gap-1.5 text-center">
        {!landed ? (
          <p className="text-sm italic" style={{ color: theme.inkSoft }}>
            not this one
          </p>
        ) : (
          <>
            <p className="text-base" style={{ color: theme.ink }}>
              — this one.
            </p>
            {typed > 0 && (
              <p
                className="font-mono text-sm tracking-wide"
                style={{ color: theme.ink }}
              >
                {catalogLine.slice(0, typed)}
                {typed < catalogLine.length && (
                  <span className="opacity-50">|</span>
                )}
              </p>
            )}
            {showMessage && (
              <div className="transition-opacity duration-500 flex flex-col items-center gap-1.5">
                <p
                  className="font-mono text-xs"
                  style={{ color: theme.inkFaint }}
                >
                  {address.coordinate} · in the space of all shapes
                </p>
                <p
                  className="font-mono text-xs"
                  style={{ color: theme.inkFaint }}
                >
                  {structure}
                </p>
                <p
                  className="text-sm italic mt-1"
                  style={{ color: theme.inkSoft }}
                >
                  always here. you didn&apos;t make it — you found it.
                </p>
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
              </div>
            )}
          </>
        )}
      </div>

      <p
        className="absolute bottom-8 text-xs transition-opacity duration-300"
        style={{ color: theme.inkFaint }}
      >
        {showMessage ? "tap anywhere, or press Esc, to close" : "tap to reveal your shape"}
      </p>
    </div>
  );
}
