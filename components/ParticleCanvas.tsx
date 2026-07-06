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

const SPRING_STRENGTH = 3.2; // per second; how eagerly particles return to their home shape
const JITTER_SPEED = 8;
const REPEL_RADIUS = 220; // px; how far the cursor's push reaches
const REPEL_STRENGTH = 1400; // px/s; velocity at the very center of the repel radius
const BURST_RADIUS = 220;
const BURST_STRENGTH = 2200;
const BURST_DURATION_MS = 550;
const MAX_ACTIVE_BURSTS = 5;
const PARTICLE_RADIUS = 1.8;
const TRAIL_ALPHA = 0.16;

export default function ParticleCanvas({ pattern, palette, size = 560, label }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const burstsRef = useRef<{ x: number; y: number; time: number }[]>([]);
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

      const bursts = burstsRef.current.filter((b) => now - b.time < BURST_DURATION_MS);
      burstsRef.current = bursts;
      const mouse = mouseRef.current;

      for (const particle of particlesRef.current) {
        // Pull back toward the resting shape...
        let vx = (particle.homeX - particle.x) * SPRING_STRENGTH;
        let vy = (particle.homeY - particle.y) * SPRING_STRENGTH;

        // ...plus a small ambient wobble so it still feels alive at rest.
        // Skipped under prefers-reduced-motion, since it's continuous motion
        // the user never asked for (unlike the cursor/click interactions).
        const nx = (particle.x - size / 2) / (size / 2);
        const ny = (particle.y - size / 2) / (size / 2);
        const jitterAngle = flowAngle(nx, ny, t, pattern.flow);
        if (!reducedMotion) {
          vx += Math.cos(jitterAngle) * JITTER_SPEED;
          vy += Math.sin(jitterAngle) * JITTER_SPEED;
        }

        if (mouse) {
          const dx = particle.x - mouse.x;
          const dy = particle.y - mouse.y;
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
          if (dist < BURST_RADIUS && dist > 0.01) {
            const decay = 1 - (now - burst.time) / BURST_DURATION_MS;
            const force = ((BURST_RADIUS - dist) / BURST_RADIUS) * BURST_STRENGTH * decay;
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

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleMouseLeave() {
    mouseRef.current = null;
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    burstsRef.current = [
      ...burstsRef.current,
      { x: e.clientX - rect.left, y: e.clientY - rect.top, time: performance.now() },
    ].slice(-MAX_ACTIVE_BURSTS);
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      role="img"
      aria-label={label ?? "A one-of-a-kind particle shape"}
      className="rounded-2xl shadow-2xl shadow-black/40 cursor-pointer touch-none bg-white/40 border border-stone-300"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
}
