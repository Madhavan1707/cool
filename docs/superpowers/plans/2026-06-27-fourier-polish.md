# Fourier Epicycles Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the working Fourier Epicycles demo into a visually stunning experience with rainbow comet trails, glowing particles, animated dot-grid background, four color themes, auto-play on load, pause/resume, keyboard shortcuts, and a redesigned glassmorphism control bar.

**Architecture:** All canvas rendering stays in a single `requestAnimationFrame` loop inside `FourierEpicycles.tsx`. A new `ControlBar.tsx` handles all UI chrome (buttons, sliders, theme swatches, progress arc). A new `lib/themes.ts` defines the four color theme data objects that both canvas and UI components read.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Canvas 2D API

## Global Constraints

- No new npm packages — use only what is already installed
- All canvas drawing in CSS pixels (DPR scaling via `ctx.setTransform` applied each frame)
- `AnimState` ref holds all animation state; React state is only for UI re-renders
- `SAMPLE_N = 256` stays constant throughout
- Dev server runs on `http://localhost:3000`; verify each task there
- Build must pass `npm run build` (TypeScript strict mode) before committing each task

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `lib/themes.ts` | **Create** | Theme data model, 4 theme configs, helper functions |
| `app/globals.css` | **Modify** | Add `@keyframes shimmer` and `@keyframes pulse-glow` |
| `components/ControlBar.tsx` | **Create** | Glassmorphism pill UI — all buttons, sliders, theme swatches, progress arc, keyboard hints |
| `components/FourierEpicycles.tsx` | **Modify** | Canvas loop visuals, extended state, interaction handlers, wires ControlBar |
| `lib/dft.ts` | No change | — |
| `lib/presets.ts` | No change | — |

---

## Task 1: Theme System

**Files:**
- Create: `lib/themes.ts`

**Interfaces:**
- Produces: `ThemeName`, `ThemeConfig`, `THEMES`, `THEME_ORDER`, `getTheme(name)`, `nextTheme(current)`

- [ ] **Step 1: Create `lib/themes.ts`**

```typescript
export type ThemeName = 'neon' | 'aurora' | 'fire' | 'ice';

export interface ThemeConfig {
  bgColor: string;
  traceHueOffset: number;   // base hue added to time-driven hue rotation
  circleColor: string;      // rgba for epicycle circle outlines
  radiusColor: string;      // rgba for spoke lines
  accentHex: string;        // hex for UI accent
  accentRgb: string;        // "r, g, b" for rgba() usage
  label: string;
  emoji: string;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  neon: {
    bgColor: '#08080f',
    traceHueOffset: 150,
    circleColor: 'rgba(0, 255, 136, 0.08)',
    radiusColor: 'rgba(80, 190, 255, 0.75)',
    accentHex: '#00ff88',
    accentRgb: '0, 255, 136',
    label: 'Neon',
    emoji: '⚡',
  },
  aurora: {
    bgColor: '#06060f',
    traceHueOffset: 270,
    circleColor: 'rgba(180, 100, 255, 0.08)',
    radiusColor: 'rgba(180, 100, 255, 0.75)',
    accentHex: '#bf5fff',
    accentRgb: '191, 95, 255',
    label: 'Aurora',
    emoji: '🌌',
  },
  fire: {
    bgColor: '#0f0806',
    traceHueOffset: 20,
    circleColor: 'rgba(255, 100, 50, 0.08)',
    radiusColor: 'rgba(255, 150, 50, 0.75)',
    accentHex: '#ff6030',
    accentRgb: '255, 96, 48',
    label: 'Fire',
    emoji: '🔥',
  },
  ice: {
    bgColor: '#060c0f',
    traceHueOffset: 195,
    circleColor: 'rgba(100, 200, 255, 0.08)',
    radiusColor: 'rgba(100, 220, 255, 0.75)',
    accentHex: '#60d0ff',
    accentRgb: '96, 208, 255',
    label: 'Ice',
    emoji: '❄️',
  },
};

export const THEME_ORDER: ThemeName[] = ['neon', 'aurora', 'fire', 'ice'];

export function getTheme(name: ThemeName): ThemeConfig {
  return THEMES[name];
}

export function nextTheme(current: ThemeName): ThemeName {
  const idx = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "E:/claude/cool" && npm run build
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd "E:/claude/cool" && git add lib/themes.ts && git commit -m "feat: add color theme system (neon, aurora, fire, ice)"
```

---

## Task 2: CSS Animations

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `.shimmer-text` utility class, `.pulse-glow` utility class, CSS custom props `--accent-color` and `--accent-rgb`

- [ ] **Step 1: Replace `app/globals.css` with the following**

```css
@import "tailwindcss";

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

@keyframes shimmer {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0); }
  50%       { box-shadow: 0 0 0 8px rgba(var(--accent-rgb), 0.35); }
}

.shimmer-text {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.9) 25%,
    var(--accent-color, #00ff88) 50%,
    rgba(255, 255, 255, 0.9) 75%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 3s linear infinite;
}

.pulse-glow {
  animation: pulse-glow 1s ease-in-out infinite;
}
```

- [ ] **Step 2: Verify dev server loads without CSS errors**

Open `http://localhost:3000` — page renders, no console errors.

- [ ] **Step 3: Commit**

```bash
cd "E:/claude/cool" && git add app/globals.css && git commit -m "feat: add shimmer and pulse-glow CSS animations"
```

---

## Task 3: Canvas Visual Upgrades

**Files:**
- Modify: `components/FourierEpicycles.tsx`

**Interfaces:**
- Consumes: `getTheme`, `ThemeName`, `nextTheme` from `lib/themes.ts`
- Produces: Extended `AnimState` with `paused`, `particles`, `theme`, `burstPending`, `activePreset`; updated canvas rendering with dot grid, comet trail, particles, theme colors

- [ ] **Step 1: Add `Particle` type and extend `AnimState` at the top of `FourierEpicycles.tsx`**

Replace the existing imports block and type definitions (lines 1–36) with:

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { computeDFT, resample, type Epicycle } from '@/lib/dft';
import { generatePreset, type PresetName } from '@/lib/presets';
import { getTheme, nextTheme, type ThemeName } from '@/lib/themes';

const DRAW_COLOR = 'rgba(255, 255, 255, 0.65)';
const SAMPLE_N = 256;
const TAIL_LEN = 80;
const MAX_PARTICLES = 60;
const ARC_CIRC = 2 * Math.PI * 22; // SVG circle r=22 circumference ≈ 138.2

type AppMode = 'draw' | 'animate';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;   // 1.0 → 0.0
  size: number;
  hue: number;
}

interface AnimState {
  mode: AppMode;
  rawPoints: { x: number; y: number }[];
  centeredSampled: { x: number; y: number }[];
  epicycles: Epicycle[];
  tracedPath: { x: number; y: number }[];
  time: number;
  speed: number;
  numCircles: number;
  isDown: boolean;
  cx: number;
  cy: number;
  paused: boolean;
  particles: Particle[];
  theme: ThemeName;
  burstPending: boolean;
  activePreset: PresetName | null;
}

const PRESETS: { name: PresetName; label: string; emoji: string }[] = [
  { name: 'heart',    label: 'Heart',    emoji: '♥' },
  { name: 'star',     label: 'Star',     emoji: '★' },
  { name: 'infinity', label: 'Infinity', emoji: '∞' },
  { name: 'clover',   label: 'Clover',   emoji: '☘' },
];
```

- [ ] **Step 2: Update the `useRef<AnimState>` initial value to include new fields**

Find the `s = useRef<AnimState>({` block and replace it entirely with:

```typescript
  const s = useRef<AnimState>({
    mode: 'draw',
    rawPoints: [],
    centeredSampled: [],
    epicycles: [],
    tracedPath: [],
    time: 0,
    speed: 1,
    numCircles: SAMPLE_N,
    isDown: false,
    cx: 0,
    cy: 0,
    paused: false,
    particles: [],
    theme: 'neon',
    burstPending: false,
    activePreset: null,
  });
```

- [ ] **Step 3: Add new React state variables after the existing ones**

After `const [numCircles, setNumCircles] = useState(SAMPLE_N);` add:

```typescript
  const [paused, setPaused] = useState(false);
  const [theme, setTheme] = useState<ThemeName>('neon');
  const [activePreset, setActivePreset] = useState<PresetName | null>(null);
  const [animatePulse, setAnimatePulse] = useState(false);
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const arcCircleRef = useRef<SVGCircleElement>(null);
```

- [ ] **Step 4: Add sync effects for new ref fields after the existing sync effects**

After the `useEffect(() => { s.current.numCircles = numCircles; }, [numCircles]);` line add:

```typescript
  useEffect(() => { s.current.paused = paused; }, [paused]);
  useEffect(() => { s.current.theme = theme; }, [theme]);
```

- [ ] **Step 5: Replace the entire `frame` function body inside the main `useEffect`**

Find the `const frame = () => {` block (everything from that line to the closing `};` before `rafRef.current = requestAnimationFrame(frame);`) and replace it with:

```typescript
    const frame = () => {
      const st = s.current;
      const logicalW = canvas.width / dpr;
      const logicalH = canvas.height / dpr;
      const th = getTheme(st.theme);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = th.bgColor;
      ctx.fillRect(0, 0, logicalW, logicalH);

      if (st.mode === 'draw') {
        if (st.rawPoints.length > 1) {
          // Main drawn path
          ctx.beginPath();
          ctx.strokeStyle = DRAW_COLOR;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          st.rawPoints.forEach((p, i) =>
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
          );
          ctx.stroke();

          // Dashed closing hint
          const first = st.rawPoints[0];
          const last = st.rawPoints[st.rawPoints.length - 1];
          ctx.beginPath();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(first.x, first.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        const { cx, cy } = st;

        // Animated dot grid
        const gridSize = 40;
        for (let gx = 0; gx < logicalW; gx += gridSize) {
          for (let gy = 0; gy < logicalH; gy += gridSize) {
            const dist = Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2);
            const pulse = Math.sin(dist / 80 - st.time * 0.5) * 0.025 + 0.03;
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse.toFixed(3)})`;
            ctx.arc(gx, gy, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Ghost of original shape
        if (st.centeredSampled.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          st.centeredSampled.forEach((p, i) =>
            i === 0 ? ctx.moveTo(cx + p.x, cy + p.y) : ctx.lineTo(cx + p.x, cy + p.y)
          );
          ctx.closePath();
          ctx.stroke();
        }

        // Epicycles
        const count = Math.min(st.numCircles, st.epicycles.length);
        let x = cx;
        let y = cy;

        for (let i = 0; i < count; i++) {
          const { freq, amp, phase } = st.epicycles[i];
          if (amp < 0.4) continue;
          const px = x;
          const py = y;
          x += amp * Math.cos(freq * st.time + phase);
          y += amp * Math.sin(freq * st.time + phase);

          ctx.beginPath();
          ctx.strokeStyle = th.circleColor;
          ctx.lineWidth = 0.8;
          ctx.arc(px, py, amp, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = th.radiusColor;
          ctx.lineWidth = 1;
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();
        }

        // Current hue for trace and particles
        const baseHue = th.traceHueOffset + (st.time / (2 * Math.PI)) * 360;

        // Completed path (before comet tail)
        const tailStart = Math.max(0, st.tracedPath.length - TAIL_LEN);
        if (st.tracedPath.length > 1 && tailStart > 0) {
          ctx.beginPath();
          ctx.strokeStyle = `hsl(${baseHue % 360}, 100%, 65%)`;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (let i = 0; i <= tailStart; i++) {
            if (i === 0) ctx.moveTo(st.tracedPath[i].x, st.tracedPath[i].y);
            else ctx.lineTo(st.tracedPath[i].x, st.tracedPath[i].y);
          }
          ctx.stroke();
        }

        // Comet tail: last TAIL_LEN segments, fading toward the back
        for (let i = tailStart; i < st.tracedPath.length - 1; i++) {
          const progress = (i - tailStart) / TAIL_LEN;
          const hue = (baseHue + progress * 60) % 360;
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${0.1 + progress * 0.9})`;
          ctx.lineWidth = 1 + progress * 2;
          ctx.lineCap = 'round';
          ctx.moveTo(st.tracedPath[i].x, st.tracedPath[i].y);
          ctx.lineTo(st.tracedPath[i + 1].x, st.tracedPath[i + 1].y);
          ctx.stroke();
        }

        // Tip dot
        ctx.beginPath();
        ctx.fillStyle = `hsl(${baseHue % 360}, 100%, 70%)`;
        ctx.shadowColor = `hsl(${baseHue % 360}, 100%, 70%)`;
        ctx.shadowBlur = 10;
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Spawn tip particles (2–3 per frame)
        if (!st.paused && st.particles.length < MAX_PARTICLES) {
          const n = 2 + Math.floor(Math.random() * 2);
          for (let p = 0; p < n && st.particles.length < MAX_PARTICLES; p++) {
            st.particles.push({
              x: x + (Math.random() - 0.5) * 4,
              y: y + (Math.random() - 0.5) * 4,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              life: 1.0,
              size: 1 + Math.random() * 3,
              hue: baseHue % 360,
            });
          }
        }

        // Draw + update particles
        ctx.save();
        for (const p of st.particles) {
          if (!st.paused) {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.06;
          }
          if (p.life <= 0) continue;
          ctx.beginPath();
          ctx.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
          ctx.shadowBlur = 6;
          ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life})`;
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        st.particles = st.particles.filter(p => p.life > 0);

        // Advance time and push to trace
        if (!st.paused) {
          st.tracedPath.push({ x, y });
          st.time += (2 * Math.PI / SAMPLE_N) * st.speed;

          if (st.time >= 2 * Math.PI) {
            st.time = 0;
            st.tracedPath = [];
            // Cycle-completion burst
            for (let i = 0; i < 40; i++) {
              const angle = (i / 40) * Math.PI * 2;
              const spd = 2 + Math.random() * 3;
              st.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1.0,
                size: 2 + Math.random() * 4,
                hue: (baseHue + i * 9) % 360,
              });
            }
          }
        }

        // Update progress arc DOM directly (no React re-render)
        if (arcCircleRef.current) {
          const progress = st.time / (2 * Math.PI);
          arcCircleRef.current.style.strokeDashoffset = String(ARC_CIRC * (1 - progress));
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    };
```

- [ ] **Step 6: Verify build passes**

```bash
cd "E:/claude/cool" && npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 7: Visual check — open browser**

Navigate to `http://localhost:3000` and click **Heart**. Confirm:
- Dark background color matches Neon theme (`#08080f`)
- Dot grid pulses on the background
- Trace is a rainbow comet (fades toward the tail)
- Small glowing particles stream from the tip
- A burst of particles fires when the cycle completes

- [ ] **Step 8: Commit**

```bash
cd "E:/claude/cool" && git add components/FourierEpicycles.tsx && git commit -m "feat: rainbow comet trail, particle system, dot grid, theme-aware canvas rendering"
```

---

## Task 4: Interaction Upgrades

**Files:**
- Modify: `components/FourierEpicycles.tsx`

**Interfaces:**
- Consumes: all existing callbacks + new `setPaused`, `setTheme`, `setAnimatePulse`, `setShowHints`, `setCanvasVisible`
- Produces: `onPause` handler, keyboard listener, auto-play on mount, draw-mode pulse UX

- [ ] **Step 1: Update `startAnimate` to also reset pulse and update activePreset**

Find the `startAnimate` useCallback and replace it entirely:

```typescript
  const startAnimate = useCallback(() => {
    if (s.current.rawPoints.length < 5) return;
    const cx = s.current.cx;
    const cy = s.current.cy;
    const sampled = resample(s.current.rawPoints, SAMPLE_N);
    const centered = sampled.map(p => ({ x: p.x - cx, y: p.y - cy }));
    s.current.centeredSampled = centered;
    s.current.epicycles = computeDFT(centered);
    s.current.tracedPath = [];
    s.current.time = 0;
    s.current.numCircles = numCircles;
    s.current.paused = false;
    s.current.mode = 'animate';
    setPaused(false);
    setMode('animate');
    setAnimatePulse(false);
  }, [numCircles]);
```

- [ ] **Step 2: Update `startDraw` to also clear new state**

```typescript
  const startDraw = useCallback(() => {
    s.current.mode = 'draw';
    s.current.rawPoints = [];
    s.current.epicycles = [];
    s.current.tracedPath = [];
    s.current.centeredSampled = [];
    s.current.particles = [];
    s.current.time = 0;
    s.current.paused = false;
    s.current.activePreset = null;
    setMode('draw');
    setPaused(false);
    setCanAnimate(false);
    setActivePreset(null);
    setAnimatePulse(false);
  }, []);
```

- [ ] **Step 3: Update `loadPreset` to also set activePreset and reset paused**

```typescript
  const loadPreset = useCallback((name: PresetName) => {
    const scale = Math.min(window.innerWidth, window.innerHeight) * 0.32;
    const cx = s.current.cx;
    const cy = s.current.cy;
    const raw = generatePreset(name, cx, cy, scale);
    const sampled = resample(raw, SAMPLE_N);
    const centered = sampled.map(p => ({ x: p.x - cx, y: p.y - cy }));
    s.current.rawPoints = raw;
    s.current.centeredSampled = centered;
    s.current.epicycles = computeDFT(centered);
    s.current.tracedPath = [];
    s.current.particles = [];
    s.current.time = 0;
    s.current.numCircles = numCircles;
    s.current.paused = false;
    s.current.activePreset = name;
    s.current.mode = 'animate';
    setMode('animate');
    setPaused(false);
    setCanAnimate(true);
    setActivePreset(name);
    setAnimatePulse(false);
  }, [numCircles]);
```

- [ ] **Step 4: Add `togglePause` callback after `loadPreset`**

```typescript
  const togglePause = useCallback(() => {
    const next = !s.current.paused;
    s.current.paused = next;
    setPaused(next);
  }, []);
```

- [ ] **Step 5: Update `onPointerUp` to trigger Animate button pulse**

```typescript
  const onPointerUp = useCallback(() => {
    if (!s.current.isDown) return;
    s.current.isDown = false;
    if (s.current.rawPoints.length > 5) {
      setCanAnimate(true);
      setAnimatePulse(true);
      setTimeout(() => setAnimatePulse(false), 2000);
    }
  }, []);
```

- [ ] **Step 6: Add keyboard shortcuts + auto-play + hints effect**

Add these three `useEffect` blocks after the existing sync effects and before the main canvas `useEffect`:

```typescript
  // Stable ref so keyboard handler never goes stale
  const actionsRef = useRef({ loadPreset, startDraw, togglePause });
  useEffect(() => { actionsRef.current = { loadPreset, startDraw, togglePause }; },
    [loadPreset, startDraw, togglePause]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { loadPreset, startDraw, togglePause } = actionsRef.current;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (s.current.mode === 'animate') togglePause();
          break;
        case 'KeyR': startDraw(); break;
        case 'Digit1': loadPreset('heart'); break;
        case 'Digit2': loadPreset('star'); break;
        case 'Digit3': loadPreset('infinity'); break;
        case 'Digit4': loadPreset('clover'); break;
        case 'ArrowUp':
          e.preventDefault();
          setSpeed(prev => Math.min(5, Math.round((prev + 0.5) * 10) / 10));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSpeed(prev => Math.max(0.1, Math.round((prev - 0.5) * 10) / 10));
          break;
        case 'KeyT':
          setTheme(prev => {
            const next = nextTheme(prev);
            s.current.theme = next;
            return next;
          });
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-play heart on mount + show keyboard hints
  useEffect(() => {
    const already = sessionStorage.getItem('fourier-hints-seen');
    if (!already) {
      setShowHints(true);
      sessionStorage.setItem('fourier-hints-seen', '1');
      setTimeout(() => setShowHints(false), 4000);
    }
    const t = setTimeout(() => {
      actionsRef.current.loadPreset('heart');
      setCanvasVisible(true);
    }, 600);
    setCanvasVisible(true);
    return () => clearTimeout(t);
  }, []);
```

- [ ] **Step 7: Verify build passes**

```bash
cd "E:/claude/cool" && npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 8: Visual + keyboard check**

1. Open `http://localhost:3000` — heart should auto-play within ~1s.
2. Press `Space` — animation freezes. Press again — resumes.
3. Press `1`, `2`, `3`, `4` — each loads the corresponding preset.
4. Press `T` — background color changes (Aurora theme = deep navy with violet accent).
5. Press `↑`/`↓` — speed changes.
6. Press `R` — returns to draw mode.

- [ ] **Step 9: Commit**

```bash
cd "E:/claude/cool" && git add components/FourierEpicycles.tsx && git commit -m "feat: pause/resume, keyboard shortcuts, auto-play on mount, cycle burst, draw hints"
```

---

## Task 5: ControlBar Component

**Files:**
- Create: `components/ControlBar.tsx`

**Interfaces:**
- Consumes: `PresetName` from `lib/presets`, `ThemeName`, `ThemeConfig`, `THEMES`, `THEME_ORDER` from `lib/themes`, `ARC_CIRC` constant (pass as prop or compute locally)
- Produces: `<ControlBar>` React component

- [ ] **Step 1: Create `components/ControlBar.tsx`**

```typescript
'use client';

import { type RefObject } from 'react';
import { type PresetName } from '@/lib/presets';
import { type ThemeName, THEMES, THEME_ORDER } from '@/lib/themes';

const ARC_R = 22;
const ARC_CIRC = 2 * Math.PI * ARC_R;

const PRESET_EMOJIS: Record<PresetName, string> = {
  heart: '♥', star: '★', infinity: '∞', clover: '☘',
};

interface ControlBarProps {
  mode: 'draw' | 'animate';
  paused: boolean;
  canAnimate: boolean;
  speed: number;
  numCircles: number;
  activePreset: PresetName | null;
  theme: ThemeName;
  animatePulse: boolean;
  showHints: boolean;
  arcCircleRef: RefObject<SVGCircleElement | null>;
  onDraw: () => void;
  onAnimate: () => void;
  onPause: () => void;
  onPreset: (name: PresetName) => void;
  onSpeedChange: (v: number) => void;
  onCirclesChange: (v: number) => void;
  onTheme: (t: ThemeName) => void;
}

// Inline SVG icons
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>
);

export default function ControlBar({
  mode, paused, canAnimate, speed, numCircles,
  activePreset, theme, animatePulse, showHints,
  arcCircleRef,
  onDraw, onAnimate, onPause, onPreset,
  onSpeedChange, onCirclesChange, onTheme,
}: ControlBarProps) {
  const isAnimating = mode === 'animate';
  const th = THEMES[theme];
  const accent = th.accentHex;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none">
      {/* Keyboard hints — fade out after 4s */}
      <div
        className="text-white/30 text-[11px] tracking-wide transition-opacity duration-1000"
        style={{ opacity: showHints ? 1 : 0 }}
      >
        Space&nbsp;pause&nbsp;·&nbsp;R&nbsp;reset&nbsp;·&nbsp;1–4&nbsp;presets&nbsp;·&nbsp;T&nbsp;theme&nbsp;·&nbsp;↑↓&nbsp;speed
      </div>

      {/* Main pill */}
      <div
        className="pointer-events-auto flex flex-col gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        {/* Row 1: presets + theme swatches */}
        <div className="flex items-center gap-3">
          {/* Preset buttons */}
          <div className="flex gap-1.5">
            {(['heart', 'star', 'infinity', 'clover'] as PresetName[]).map(name => (
              <button
                key={name}
                onClick={() => onPreset(name)}
                title={name.charAt(0).toUpperCase() + name.slice(1)}
                className="w-9 h-9 rounded-full text-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  background: activePreset === name ? `rgba(${th.accentRgb}, 0.2)` : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${activePreset === name ? accent : 'rgba(255,255,255,0.12)'}`,
                  color: activePreset === name ? accent : 'rgba(255,255,255,0.6)',
                }}
              >
                {PRESET_EMOJIS[name]}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Theme swatches */}
          <div className="flex gap-2">
            {THEME_ORDER.map(t => (
              <button
                key={t}
                onClick={() => onTheme(t)}
                title={THEMES[t].label}
                className="w-5 h-5 rounded-full transition-all duration-200 hover:scale-125"
                style={{
                  background: THEMES[t].accentHex,
                  outline: t === theme ? `2px solid white` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>

        {/* Row 2: main action buttons */}
        <div className="flex items-center gap-2">
          {/* Draw */}
          <button
            onClick={onDraw}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200"
            style={{
              background: !isAnimating ? 'white' : 'rgba(255,255,255,0.06)',
              color: !isAnimating ? 'black' : 'rgba(255,255,255,0.65)',
              border: `1px solid ${!isAnimating ? 'white' : 'rgba(255,255,255,0.2)'}`,
            }}
          >
            <PencilIcon />
            Draw
          </button>

          {/* Animate with progress arc */}
          <div className="relative">
            {isAnimating && (
              <svg
                className="absolute pointer-events-none"
                style={{
                  top: '-4px', left: '-4px',
                  width: 'calc(100% + 8px)',
                  height: 'calc(100% + 8px)',
                  transform: 'rotate(-90deg)',
                  overflow: 'visible',
                }}
              >
                <circle
                  ref={arcCircleRef}
                  cx="50%"
                  cy="50%"
                  r={ARC_R}
                  fill="none"
                  stroke={accent}
                  strokeOpacity={0.7}
                  strokeWidth={2}
                  strokeDasharray={`${ARC_CIRC} ${ARC_CIRC}`}
                  strokeDashoffset={ARC_CIRC}
                  strokeLinecap="round"
                />
              </svg>
            )}
            <button
              onClick={onAnimate}
              disabled={!canAnimate && !isAnimating}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                animatePulse && !isAnimating ? 'pulse-glow' : ''
              }`}
              style={{
                background: isAnimating ? accent : canAnimate ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                color: isAnimating ? 'black' : canAnimate ? accent : 'rgba(255,255,255,0.2)',
                border: `1px solid ${isAnimating ? accent : canAnimate ? accent + '80' : 'rgba(255,255,255,0.08)'}`,
                cursor: !canAnimate && !isAnimating ? 'not-allowed' : 'pointer',
                '--accent-rgb': th.accentRgb,
              } as React.CSSProperties}
            >
              <PlayIcon />
              Animate
            </button>
          </div>

          {/* Pause (animate mode only) */}
          {isAnimating && (
            <button
              onClick={onPause}
              title="Pause / Resume (Space)"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{
                background: paused ? `rgba(${th.accentRgb}, 0.2)` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${paused ? accent : 'rgba(255,255,255,0.15)'}`,
                color: paused ? accent : 'rgba(255,255,255,0.6)',
              }}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
          )}
        </div>

        {/* Row 3: sliders */}
        <div className="flex gap-6 text-[11px] text-white/40">
          <label className="flex flex-col items-center gap-1.5">
            <span>Speed&nbsp;{speed.toFixed(1)}×</span>
            <input
              type="range" min="0.1" max="5" step="0.1" value={speed}
              onChange={e => onSpeedChange(parseFloat(e.target.value))}
              className="w-28"
              style={{ accentColor: accent }}
            />
          </label>
          <label className="flex flex-col items-center gap-1.5">
            <span>Circles&nbsp;{numCircles}</span>
            <input
              type="range" min="1" max={256} step="1" value={numCircles}
              onChange={e => onCirclesChange(parseInt(e.target.value))}
              className="w-28"
              style={{ accentColor: accent }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "E:/claude/cool" && npm run build
```

Expected: `✓ Compiled successfully`. ControlBar is not yet wired in, so the page still shows the old UI.

- [ ] **Step 3: Commit**

```bash
cd "E:/claude/cool" && git add components/ControlBar.tsx && git commit -m "feat: glassmorphism ControlBar with progress arc, theme swatches, icons"
```

---

## Task 6: Wire ControlBar, Header Shimmer, Canvas Fade-in

**Files:**
- Modify: `components/FourierEpicycles.tsx`

**Interfaces:**
- Consumes: `ControlBar` from `./ControlBar`, all state/callbacks from previous tasks
- Produces: fully wired page with shimmer header, contextual sub-text, canvas fade-in, ControlBar replacing old inline UI

- [ ] **Step 1: Add ControlBar import at the top of `FourierEpicycles.tsx`**

After the existing imports, add:

```typescript
import ControlBar from '@/components/ControlBar';
```

- [ ] **Step 2: Replace the entire `return (...)` JSX block**

Find everything from `return (` to the final `);` and replace with:

```tsx
  const isAnimating = mode === 'animate';
  const th = getTheme(theme);

  // Contextual sub-text
  const subText = (() => {
    if (!isAnimating && !canAnimate) return 'pick a preset or draw a shape';
    if (!isAnimating && canAnimate) return 'shape ready — click Animate';
    if (isAnimating && paused) return 'paused — press Space to resume';
    return `${Math.min(numCircles, 256)} circles · ${th.label}`;
  })();

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ background: th.bgColor }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none transition-opacity duration-500"
        style={{
          cursor: mode === 'draw' ? 'crosshair' : 'default',
          opacity: canvasVisible ? 1 : 0,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Header */}
      <div className="absolute top-7 left-8 pointer-events-none">
        <h1
          className="shimmer-text text-2xl font-semibold tracking-tight"
          style={{ '--accent-color': th.accentHex } as React.CSSProperties}
        >
          Fourier Epicycles
        </h1>
        <p className="text-white/35 text-sm mt-1 transition-all duration-300">
          {subText}
        </p>
      </div>

      {/* Control bar */}
      <ControlBar
        mode={mode}
        paused={paused}
        canAnimate={canAnimate}
        speed={speed}
        numCircles={numCircles}
        activePreset={activePreset}
        theme={theme}
        animatePulse={animatePulse}
        showHints={showHints}
        arcCircleRef={arcCircleRef}
        onDraw={startDraw}
        onAnimate={startAnimate}
        onPause={togglePause}
        onPreset={loadPreset}
        onSpeedChange={v => { setSpeed(v); s.current.speed = v; }}
        onCirclesChange={v => { setNumCircles(v); s.current.numCircles = v; }}
        onTheme={t => { setTheme(t); s.current.theme = t; }}
      />
    </div>
  );
```

- [ ] **Step 3: Verify build passes**

```bash
cd "E:/claude/cool" && npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Full visual + interaction QA in browser**

Open `http://localhost:3000`. Check each item:

1. **Auto-play**: heart animates within ~1s of page load, canvas fades in smoothly
2. **Shimmer title**: "Fourier Epicycles" shimmers with the green accent color
3. **Sub-text**: shows "N circles · Neon" while animating, updates contextually
4. **Dot grid**: subtle pulsing grid visible on background
5. **Comet trail**: rainbow hue-shifts over the cycle, fades toward the tail
6. **Particles**: small glowing dots stream from the tip
7. **Burst**: at cycle completion, 40 particles explode from the tip
8. **Theme swatches**: click ⚡🌌🔥❄️ — background, accent, and circles all change color
9. **Preset emoji buttons**: active preset has accent border; clicking another switches instantly
10. **Pause button**: appears in animate mode; clicking freezes circles; icon changes to play; Space also works
11. **Progress arc**: thin arc around Animate button traces 0→360° per cycle
12. **Draw mode**: click Draw, draw on canvas, dashed closing line appears, Animate button pulses
13. **Keyboard hints**: visible for 4s on first visit, gone after

- [ ] **Step 5: Commit**

```bash
cd "E:/claude/cool" && git add components/FourierEpicycles.tsx && git commit -m "feat: wire ControlBar, shimmer header, contextual sub-text, canvas fade-in"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Rainbow comet trail | Task 3 |
| Glowing tip particles | Task 3 |
| Animated dot-grid background | Task 3 |
| 4 color themes (Neon/Aurora/Fire/Ice) | Task 1 + Task 3 |
| Auto-play heart on load | Task 4 |
| Pause/Resume button + Space key | Task 4 + Task 5 |
| Keyboard shortcuts (all 8) | Task 4 |
| Cycle-completion burst | Task 3 |
| Draw UX: dashed closing hint | Task 3 |
| Draw UX: Animate button pulses | Task 4 |
| Glassmorphism control pill | Task 5 |
| Icon buttons (pencil, play, pause) | Task 5 |
| Preset buttons with emoji + active state | Task 5 |
| Theme swatches | Task 5 |
| Keyboard hint bar (4s, sessionStorage) | Task 4 + Task 5 |
| Header shimmer animation | Task 6 |
| Contextual sub-text | Task 6 |
| Progress arc on Animate button | Task 5 + Task 3 (arc update in RAF) |
| Canvas fade-in on mount | Task 4 + Task 6 |

All spec requirements are covered.

**Type consistency check:**
- `ThemeName`, `ThemeConfig`, `getTheme`, `nextTheme` defined in Task 1, consumed identically in Tasks 3, 4, 5, 6 ✓
- `Particle` type defined in Task 3, used only within the frame loop ✓
- `arcCircleRef: RefObject<SVGCircleElement | null>` defined in Task 3, passed to Task 5, used in Task 3's frame loop ✓
- `ARC_CIRC` defined in Task 3 as a module constant; Task 5 uses a local `ARC_CIRC` computed the same way — consistent ✓
- `PresetName` values `'heart' | 'star' | 'infinity' | 'clover'` consistent across all tasks ✓
