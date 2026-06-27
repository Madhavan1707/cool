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

  useEffect(() => { s.current.speed = speed; }, [speed]);
  useEffect(() => { s.current.numCircles = numCircles; }, [numCircles]);
  useEffect(() => { s.current.paused = paused; }, [paused]);
  useEffect(() => { s.current.theme = theme; }, [theme]);

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
    if (s.current.rawPoints.length > 5) setCanAnimate(true);
  }, []);

  const startAnimate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || s.current.rawPoints.length < 5) return;
    const cx = s.current.cx;
    const cy = s.current.cy;
    const sampled = resample(s.current.rawPoints, SAMPLE_N);
    const centered = sampled.map(p => ({ x: p.x - cx, y: p.y - cy }));
    s.current.centeredSampled = centered;
    s.current.epicycles = computeDFT(centered);
    s.current.tracedPath = [];
    s.current.time = 0;
    s.current.numCircles = numCircles;
    s.current.mode = 'animate';
    setMode('animate');
  }, [numCircles]);

  const startDraw = useCallback(() => {
    s.current.mode = 'draw';
    s.current.rawPoints = [];
    s.current.epicycles = [];
    s.current.tracedPath = [];
    s.current.centeredSampled = [];
    s.current.time = 0;
    setMode('draw');
    setCanAnimate(false);
  }, []);

  const loadPreset = useCallback((name: PresetName) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    s.current.time = 0;
    s.current.numCircles = numCircles;
    s.current.mode = 'animate';
    setMode('animate');
    setCanAnimate(true);
  }, [numCircles]);

  const isAnimating = mode === 'animate';

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: getTheme(theme).bgColor }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Header */}
      <div className="absolute top-7 left-8 pointer-events-none">
        <h1 className="text-white text-2xl font-semibold tracking-tight">
          Fourier Epicycles
        </h1>
        <p className="text-white/35 text-sm mt-1">
          {isAnimating
            ? 'Spinning circles reconstruct your drawing'
            : 'Draw a shape on the canvas, then click Animate'}
        </p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        {/* Presets */}
        <div className="flex gap-2">
          {PRESETS.map(({ name, label }) => (
            <button
              key={name}
              onClick={() => loadPreset(name)}
              className="px-4 py-1.5 text-xs font-medium text-white/60 rounded-full border border-white/15 hover:border-white/50 hover:text-white/90 backdrop-blur-sm bg-white/[0.04] transition-all"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main buttons */}
        <div className="flex gap-3">
          <button
            onClick={startDraw}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              !isAnimating
                ? 'bg-white text-black'
                : 'border border-white/25 text-white/70 hover:border-white/50 hover:text-white backdrop-blur-sm bg-white/[0.04]'
            }`}
          >
            Draw
          </button>
          <button
            onClick={startAnimate}
            disabled={!canAnimate && !isAnimating}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              isAnimating
                ? 'bg-emerald-400 text-black'
                : canAnimate
                ? 'border border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10 backdrop-blur-sm bg-white/[0.04]'
                : 'border border-white/10 text-white/25 cursor-not-allowed backdrop-blur-sm'
            }`}
          >
            Animate
          </button>
        </div>

        {/* Sliders */}
        <div className="flex gap-8 text-xs text-white/40">
          <label className="flex flex-col items-center gap-1.5">
            <span>Speed&nbsp;{speed.toFixed(1)}×</span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              className="w-28 accent-emerald-400"
            />
          </label>
          <label className="flex flex-col items-center gap-1.5">
            <span>Circles&nbsp;{numCircles}</span>
            <input
              type="range"
              min="1"
              max={SAMPLE_N}
              step="1"
              value={numCircles}
              onChange={e => {
                const v = parseInt(e.target.value);
                setNumCircles(v);
                s.current.numCircles = v;
              }}
              className="w-28 accent-emerald-400"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
