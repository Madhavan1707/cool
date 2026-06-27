# Fourier Epicycles — Polish Design Spec
**Date:** 2026-06-27  
**Status:** Approved

## Goal
Transform the working Fourier Epicycles demo into a visually stunning, immediately engaging experience. Pure visual delight — no educational overlays. Full pass across visuals and interactivity.

---

## Section 1: Visual Canvas Overhaul

### Rainbow Comet Trail
- Replace the solid `#00ff88` traced path with a hue-shifting comet effect.
- The last ~80 points are drawn segment-by-segment: alpha and line-width taper toward the tail (alpha 0.1→1.0, lineWidth 1→3).
- The already-completed portion of the trace draws in a single vivid color at full opacity.
- The hue drifts continuously: approximately one full rainbow revolution per cycle. Base hue derived from `(time / (2π)) * 360`.
- Theme-aware: each theme shifts the base hue offset so colors stay on-brand.

### Glowing Tip Particles
- 2–3 particles spawn each frame at the epicycle tip position.
- Each particle: random velocity ±1.5px/frame, size 1–4px, lifespan ~16 frames, inherits current trace hue.
- Particles fade via `hsla(..., life)` where `life` decrements by 0.06 per frame.
- Hard cap: 60 live particles at once. Oldest are culled when cap exceeded.
- Shadow blur `6px` on each particle for glow.

### Animated Dot-Grid Background
- 40px grid of 1px dots covering the full canvas.
- Opacity per dot: `0.03 + sin(dist_from_center / 80 − time * 0.5) * 0.025` (range ~0.005–0.055).
- Only rendered in `animate` mode. Hidden in `draw` mode to avoid distraction.
- Color: pure white. Effect is subtle — should not compete with the main animation.

### Color Themes
Four named themes stored as a constant record. Each theme defines:
- `bgColor`: canvas background hex
- `traceHueOffset`: base hue added to the time-driven hue rotation
- `circleColor`: rgba for epicycle circle outlines
- `radiusColor`: rgba for the spoke lines
- `accentHex`: used for active button states and theme swatch dot

| Theme | bgColor | traceHueOffset | Accent |
|-------|---------|---------------|--------|
| Neon | `#08080f` | 150 (green) | `#00ff88` |
| Aurora | `#06060f` | 270 (violet) | `#bf5fff` |
| Fire | `#0f0806` | 20 (orange) | `#ff6030` |
| Ice | `#060c0f` | 195 (sky) | `#60d0ff` |

Active theme stored in `AnimState` ref so canvas reads it every frame without re-render.

---

## Section 2: Interaction Layer

### Auto-Play on Load
- On mount, wait 600ms then call `loadPreset('heart')`.
- Canvas fades in from opacity 0 to 1 over 400ms via CSS transition (class toggle).
- No "intro" text or splash screen — just the animation starting.

### Pause / Resume
- New `paused: boolean` field in `AnimState`.
- When paused: skip time advancement and `tracedPath.push()`. Epicycles render at frozen `time`. Trail remains visible.
- Toggle via: Pause button in control bar, or `Space` key.
- Button shows play icon when paused, pause icon when running.
- Sub-header text updates to "paused — press Space to resume".

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Toggle pause (animate mode only) |
| `R` | Reset to draw mode |
| `1` | Load Heart preset |
| `2` | Load Star preset |
| `3` | Load Infinity preset |
| `4` | Load Clover preset |
| `↑` | Speed +0.5 (capped at 5) |
| `↓` | Speed −0.5 (floored at 0.1) |
| `T` | Cycle to next color theme |

Listener attached in the main `useEffect`, cleaned up on unmount.

### Cycle-Completion Burst
- Triggered when `time` wraps past `2π`.
- Emits 40 particles from the current tip position simultaneously.
- Particles have higher initial velocity (±4px/frame) and longer lifespan (~30 frames).
- Brief canvas flash: draw a full-canvas radial gradient `rgba(accent, 0.08)` centered on tip, decays in one frame.

### Draw UX Improvements
- After `pointerUp` with sufficient points: Animate button pulses (CSS `animate-pulse`) for 2s.
- Draw mode renders a dashed line from the last raw point back to the first raw point (closing hint). `setLineDash([6, 4])`, color `rgba(255,255,255,0.2)`.

---

## Section 3: UI & Control Bar Redesign

### Layout
Single horizontal glassmorphism pill at bottom-center:
```
[ ✏ Draw ]  [ ▶ Animate ]  |  [ ♥ ][ ★ ][ ∞ ][ ☘ ]  |  [●][●][●][●]  |  ⏸  Speed ── Circles ──
```
- `backdrop-blur-xl`, `bg-white/[0.06]`, `border border-white/[0.1]`, `rounded-2xl`, `px-6 py-3`.
- Vertical dividers (`w-px bg-white/10`) separate logical groups.
- All in one row on desktop; wraps gracefully on narrow screens.

### Icon Buttons
- Draw: pencil SVG icon + label.
- Animate: play SVG icon when stopped, pause SVG when animating. Label changes accordingly.
- Pause standalone button appears only in animate mode (icon only, no label).

### Preset Buttons
- Show emoji label only (♥ ★ ∞ ☘), no text.
- On hover: `scale-105` + border color = theme accent.
- Active preset: filled background at `accent/20`, border at accent color.

### Theme Swatches
- Four 20px circles, each filled with its accent color.
- Active theme: white ring outline (`ring-2 ring-white ring-offset-1 ring-offset-black/80`).
- Clicking cycles themes without leaving the swatch area.

### Keyboard Hint Bar
- Appears below the pill on first load.
- Content: `Space pause · R reset · 1-4 presets · T theme · ↑↓ speed`
- Fades out after 4s via CSS opacity transition. Never shown again (sessionStorage flag).

### Header
- Title "Fourier Epicycles": CSS shimmer animation — `background: linear-gradient(90deg, white, accent, white)` with `background-size: 200%` and `@keyframes shimmer { to { background-position: -200% } }` at 3s loop.
- Sub-text updates:
  - Draw mode, no points: "pick a preset or draw a shape"
  - Draw mode, points drawn: "shape ready — click Animate"
  - Animate mode running: "N circles · Theme name"
  - Animate mode paused: "paused — press Space to resume"

### Progress Arc
- Thin SVG arc overlaid on the Animate button (or as a border).
- Traces from 0° to 360° as `time` goes 0 → 2π. Resets each cycle.
- Stroke color = theme accent at 60% opacity, stroke-width 2px.
- Rendered as an absolutely-positioned SVG `<circle>` with `stroke-dasharray` and animated `stroke-dashoffset`.

---

## Implementation Notes

### Files to Change
- `components/FourierEpicycles.tsx` — main component (canvas loop, state, event handlers, JSX)
- `lib/dft.ts` — no changes needed
- `lib/presets.ts` — no changes needed
- `lib/themes.ts` — **new file**: theme definitions
- `app/globals.css` — add `@keyframes shimmer` and `@keyframes pulse-glow`

### State Additions to `AnimState`
```typescript
paused: boolean;
particles: Particle[];
theme: ThemeName;
burstPending: boolean;   // true for one frame after cycle completes
activePreset: PresetName | null;
```

### New Types
```typescript
interface Particle { x: number; y: number; vx: number; vy: number; life: number; size: number; hue: number; }
type ThemeName = 'neon' | 'aurora' | 'fire' | 'ice';
```

### Performance Budget
- Dot grid: ~1300 arc calls/frame. Acceptable at 60fps on desktop; skip on frames where `time` hasn't advanced (paused).
- Particles: max 60, each = 1 arc call. Negligible.
- Comet tail: max 80 stroke calls. Fine.
- All canvas operations stay on the main thread (no workers needed at this scale).

---

## Out of Scope
- Mobile-specific gesture handling beyond existing pointer events
- Export/save functionality
- Audio/sound effects
- WebGL acceleration
