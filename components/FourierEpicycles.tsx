'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { computeDFT, resample, type Epicycle } from '@/lib/dft';
import { generatePreset, type PresetName } from '@/lib/presets';
import { getTheme, nextTheme, type ThemeName } from '@/lib/themes';
import ControlBar from '@/components/ControlBar';

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

export default function FourierEpicycles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
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

  const [mode, setMode] = useState<AppMode>('draw');
  const [canAnimate, setCanAnimate] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [numCircles, setNumCircles] = useState(SAMPLE_N);
  const [paused, setPaused] = useState(false);
  const [theme, setTheme] = useState<ThemeName>('neon');
  const [activePreset, setActivePreset] = useState<PresetName | null>(null);
  const [animatePulse, setAnimatePulse] = useState(false);
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const arcCircleRef = useRef<SVGCircleElement>(null);

  // Sync effects — keep mutable ref in sync with React state
  useEffect(() => { s.current.speed = speed; }, [speed]);
  useEffect(() => { s.current.numCircles = numCircles; }, [numCircles]);
  useEffect(() => { s.current.paused = paused; }, [paused]);
  useEffect(() => { s.current.theme = theme; }, [theme]);

  // ── Pointer helpers ──────────────────────────────────────────────────────────

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (s.current.mode !== 'draw') return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    s.current.isDown = true;
    s.current.rawPoints = [getPoint(e)];
    setCanAnimate(false);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!s.current.isDown || s.current.mode !== 'draw') return;
    s.current.rawPoints.push(getPoint(e));
  }, []);

  const onPointerUp = useCallback(() => {
    if (!s.current.isDown) return;
    s.current.isDown = false;
    if (s.current.rawPoints.length > 5) {
      setCanAnimate(true);
      setAnimatePulse(true);
      setTimeout(() => setAnimatePulse(false), 2000);
    }
  }, []);

  // ── Mode callbacks ───────────────────────────────────────────────────────────

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

  const togglePause = useCallback(() => {
    const next = !s.current.paused;
    s.current.paused = next;
    setPaused(next);
  }, []);

  // ── Keyboard shortcuts + auto-play effects ───────────────────────────────────

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
        case 'KeyT': {
          const next = nextTheme(s.current.theme);
          s.current.theme = next;
          setTheme(next);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-play heart on mount + show keyboard hints
  useEffect(() => {
    const already = sessionStorage.getItem('fourier-hints-seen');
    let hintsTimer: ReturnType<typeof setTimeout> | null = null;
    if (!already) {
      setShowHints(true);
      sessionStorage.setItem('fourier-hints-seen', '1');
      hintsTimer = setTimeout(() => setShowHints(false), 4000);
    }
    const t = setTimeout(() => {
      actionsRef.current.loadPreset('heart');
      setCanvasVisible(true);
    }, 600);
    setCanvasVisible(true);
    return () => {
      clearTimeout(t);
      if (hintsTimer !== null) clearTimeout(hintsTimer);
    };
  }, []);

  // ── Canvas RAF loop ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      s.current.cx = w / 2;
      s.current.cy = h / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d')!;

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

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
          style={{ '--accent-color': th.accentHex } as CSSProperties}
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
}
