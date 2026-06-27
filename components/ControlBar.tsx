'use client';

import { type RefObject, type CSSProperties } from 'react';
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
              } as CSSProperties}
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
              onChange={e => onCirclesChange(parseInt(e.target.value, 10))}
              className="w-28"
              style={{ accentColor: accent }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
