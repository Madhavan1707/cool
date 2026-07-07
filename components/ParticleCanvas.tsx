"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  PALETTES,
  PaletteId,
  PersonPattern,
  flowAngle,
  paletteColor,
  shapeHomePosition,
} from "@/lib/particles";

interface ParticleCanvasProps {
  pattern: PersonPattern;
  palette: PaletteId;
  size?: number;
  label?: string;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

interface Particle {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hue: number;
}

/** An outward shockwave. Taps, hold-release flings, and supernovas are all bursts with different knobs. */
interface Burst {
  x: number;
  y: number;
  time: number;
  radius: number;
  strength: number;
  duration: number;
}

const SPRING_STRENGTH = 3.2; // per second; how eagerly particles return to their home shape
const JITTER_SPEED = 8;
const REPEL_RADIUS = 220; // px; how far the cursor's push reaches
const REPEL_STRENGTH = 1400; // px/s; velocity at the very center of the repel radius

const BURST_RADIUS = 220;
const BURST_STRENGTH = 2200;
const BURST_DURATION_MS = 550;
const MAX_ACTIVE_BURSTS = 5;

// Press-and-hold: after the threshold, the repel force inverts into an
// attract-and-swirl vortex; releasing flings everything back out.
const HOLD_THRESHOLD_MS = 150; // below this a press still counts as a tap
const ATTRACT_RADIUS = 340;
const ATTRACT_STRENGTH = 1100;
const SWIRL_STRENGTH = 900; // tangential component that makes the vortex spin

const FLING_RADIUS = 340;
const FLING_MIN_STRENGTH = 1600; // fling right at the hold threshold
const FLING_MAX_STRENGTH = 3600; // fling after a full FLING_MAX_HOLD_MS hold
const FLING_MAX_HOLD_MS = 1500; // holding longer than this stops adding power
const FLING_DURATION_MS = 650;

// Double-tap/double-click: everything on the canvas scatters and reforms.
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_DIST = 48;
const SUPERNOVA_STRENGTH = 3800;
const SUPERNOVA_DURATION_MS = 900;

const PARTICLE_RADIUS = 1.8;
const TRAIL_ALPHA = 0.16;

export default function ParticleCanvas({ pattern, palette, size = 560, label }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const holdRef = useRef<{ x: number; y: number; startTime: number } | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const burstsRef = useRef<Burst[]>([]);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Particle homes and starting positions are (re)computed once per
  // generation, in an effect (never during render, which must stay pure).
  useEffect(() => {
    particlesRef.current = Array.from({ length: pattern.particleCount }, (_, i) => {
      const theta = i / pattern.particleCount;
      const home = shapeHomePosition(theta, size, pattern.shape);
      return {
        x: Math.random() * size,
        y: Math.random() * size,
        homeX: home.x,
        homeY: home.y,
        hue: theta,
      };
    });
  }, [pattern, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const maybeContext = canvas?.getContext("2d");
    if (!canvas || !maybeContext) return;
    const context: CanvasRenderingContext2D = maybeContext;

    // Assigning .width resets/clears the bitmap even to the same value, so
    // this also wipes any leftover trail from a previous generation.
    canvas.width = size;
    canvas.height = size;

    const stops = PALETTES[palette];
    let rafId: number;
    let lastTime = performance.now();

    function frame(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const t = now / 1000;

      context.fillStyle = `rgba(255,250,242,${TRAIL_ALPHA})`;
      context.fillRect(0, 0, size, size);

      const bursts = burstsRef.current.filter((b) => now - b.time < b.duration);
      burstsRef.current = bursts;
      const pointer = pointerRef.current;
      const hold = holdRef.current;
      const attracting = hold !== null && now - hold.startTime >= HOLD_THRESHOLD_MS;

      for (const particle of particlesRef.current) {
        // Pull back toward the resting shape...
        let vx = (particle.homeX - particle.x) * SPRING_STRENGTH;
        let vy = (particle.homeY - particle.y) * SPRING_STRENGTH;

        // ...plus a small ambient wobble so it still feels alive at rest.
        // Skipped under prefers-reduced-motion, since it's continuous motion
        // the user never asked for (unlike the pointer interactions).
        const nx = (particle.x - size / 2) / (size / 2);
        const ny = (particle.y - size / 2) / (size / 2);
        const jitterAngle = flowAngle(nx, ny, t, pattern.flow);
        if (!reducedMotion) {
          vx += Math.cos(jitterAngle) * JITTER_SPEED;
          vy += Math.sin(jitterAngle) * JITTER_SPEED;
        }

        if (attracting) {
          const dx = hold.x - particle.x;
          const dy = hold.y - particle.y;
          const dist = Math.hypot(dx, dy);
          if (dist < ATTRACT_RADIUS && dist > 0.01) {
            const falloff = (ATTRACT_RADIUS - dist) / ATTRACT_RADIUS;
            vx += (dx / dist) * falloff * ATTRACT_STRENGTH;
            vy += (dy / dist) * falloff * ATTRACT_STRENGTH;
            // Perpendicular component turns the pull into a swirl.
            vx += (-dy / dist) * falloff * SWIRL_STRENGTH;
            vy += (dx / dist) * falloff * SWIRL_STRENGTH;
          }
        } else if (pointer) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REPEL_RADIUS && dist > 0.01) {
            const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_STRENGTH;
            vx += (dx / dist) * force;
            vy += (dy / dist) * force;
          }
        }

        for (const burst of bursts) {
          const dx = particle.x - burst.x;
          const dy = particle.y - burst.y;
          const dist = Math.hypot(dx, dy);
          if (dist < burst.radius && dist > 0.01) {
            const decay = 1 - (now - burst.time) / burst.duration;
            const force = ((burst.radius - dist) / burst.radius) * burst.strength * decay;
            vx += (dx / dist) * force;
            vy += (dy / dist) * force;
          }
        }

        particle.x += vx * dt;
        particle.y += vy * dt;
        particle.x = Math.min(size, Math.max(0, particle.x));
        particle.y = Math.min(size, Math.max(0, particle.y));

        const [r, g, b] = paletteColor(particle.hue + jitterAngle * 0.03, stops);
        context.beginPath();
        context.fillStyle = `rgb(${r},${g},${b})`;
        context.arc(particle.x, particle.y, PARTICLE_RADIUS, 0, Math.PI * 2);
        context.fill();
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [pattern, palette, size, reducedMotion]);

  function localPosition(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function addBurst(burst: Burst) {
    burstsRef.current = [...burstsRef.current, burst].slice(-MAX_ACTIVE_BURSTS);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    // Capture so a finger/cursor dragged off the canvas keeps steering the
    // hold instead of leaving it stuck on.
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = localPosition(e);
    pointerRef.current = pos;
    holdRef.current = { ...pos, startTime: performance.now() };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const pos = localPosition(e);
    pointerRef.current = pos;
    if (holdRef.current) {
      holdRef.current.x = pos.x;
      holdRef.current.y = pos.y;
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const now = performance.now();
    const pos = localPosition(e);
    const hold = holdRef.current;
    holdRef.current = null;
    // A finger lifts off entirely; a mouse cursor is still hovering.
    if (e.pointerType !== "mouse") pointerRef.current = null;
    if (!hold) return;

    const heldMs = now - hold.startTime;
    if (heldMs < HOLD_THRESHOLD_MS) {
      const last = lastTapRef.current;
      const isDoubleTap =
        last !== null &&
        now - last.time < DOUBLE_TAP_MS &&
        Math.hypot(pos.x - last.x, pos.y - last.y) < DOUBLE_TAP_DIST;
      if (isDoubleTap) {
        lastTapRef.current = null;
        addBurst({
          x: pos.x,
          y: pos.y,
          time: now,
          radius: size * Math.SQRT2, // reaches every corner from anywhere
          strength: SUPERNOVA_STRENGTH,
          duration: SUPERNOVA_DURATION_MS,
        });
      } else {
        lastTapRef.current = { x: pos.x, y: pos.y, time: now };
        addBurst({
          x: pos.x,
          y: pos.y,
          time: now,
          radius: BURST_RADIUS,
          strength: BURST_STRENGTH,
          duration: BURST_DURATION_MS,
        });
      }
    } else {
      // Fling: the longer the hold, the harder everything scatters.
      const power = Math.min(heldMs - HOLD_THRESHOLD_MS, FLING_MAX_HOLD_MS) / FLING_MAX_HOLD_MS;
      addBurst({
        x: pos.x,
        y: pos.y,
        time: now,
        radius: FLING_RADIUS,
        strength: FLING_MIN_STRENGTH + power * (FLING_MAX_STRENGTH - FLING_MIN_STRENGTH),
        duration: FLING_DURATION_MS,
      });
    }
  }

  function handlePointerLeave() {
    pointerRef.current = null;
  }

  function handlePointerCancel() {
    holdRef.current = null;
    pointerRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      role="img"
      aria-label={label ?? "A one-of-a-kind particle shape"}
      className="rounded-2xl shadow-2xl shadow-black/40 cursor-pointer touch-none select-none bg-white/40 border border-stone-300"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
