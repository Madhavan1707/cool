# Playful Polish — Design (Approach A, approved 2026-07-06)

Approved by Madhavan on 2026-07-06 ("go with A"). This doc is the source of
truth for continuing the work; the session ended right after approval, before
any implementation.

## Context

Fractals of You (https://fractalsofyou.vercel.app, repo
https://github.com/Madhavan1707/cool) turns typed text into a deterministic
particle shape (rose curve + flow-field jitter). Shipped so far: particle
canvas with cursor repel + click burst, single/compare modes, four palettes,
shareable URLs encoding full state (`?a=<text>&b=<text>&m=compare&p=<palette>`),
copy-link button, Vercel auto-deploy from `main`.

Known gaps this design addresses:

- Canvas uses mouse events only — **phones get no interaction at all**
  (`components/ParticleCanvas.tsx` handles `onMouseMove/Leave/Click` only).
- Empty state is a dead beige placeholder box until the user types.
- Page background is always sunrise-orange regardless of chosen palette.
- Shared links unfurl with no preview image.
- Compare mode is two static canvases with no interplay.

## Goal

Make the app tactile on every device, visually alive before and after
generating, and worth sharing — in three independently shippable waves.

## Wave 1 — Tactile & alive (do first; foundation for everything)

1. **Touch/pointer support** — replace mouse handlers on the canvas with
   pointer events (`onPointerMove`, `onPointerDown`, `onPointerUp`,
   `onPointerLeave`, plus `setPointerCapture`). Finger drag = repel (same as
   cursor), tap = burst. Canvas already has `touch-none` so no scroll fights.
2. **Living empty state** — replace the placeholder div with a real
   `ParticleCanvas` running an ambient demo: particles loosely form a slowly
   rotating sequence of words ("hello", "you?", "type your name…") using the
   existing pattern machinery seeded from those words, cross-fading every few
   seconds. First paint should already be alive. Respect
   `prefers-reduced-motion` (static shape, no cycling).
3. **Press-and-hold to attract** — while pointer is held down (after ~150ms so
   taps still burst), invert the repel force into an attract-and-swirl vortex
   (tangential component for the swirl). On release, fling particles outward
   proportional to hold time (capped). Constants live next to
   REPEL_*/BURST_* in ParticleCanvas.tsx.
4. **Double-click/double-tap supernova** — full-canvas burst (radius = canvas
   diagonal), everything scatters and reforms.
5. **Palette-matched world** — page background, focus rings, button accents,
   and canvas trail color derive from the selected palette instead of
   hardcoded sunrise orange:
   - Extend `lib/particles.ts` palettes with per-palette page theme (bg
     gradient stops, text tone, accent, canvas trail RGBA). Neon = near-black
     page + `globalCompositeOperation: "lighter"` additive glow particles;
     Ocean = deep blue-grey; Monochrome = warm paper; Sunrise = current look.
   - Smooth cross-fade on palette switch (CSS transition on background,
     trail color swaps immediately).
   - `TRAIL_ALPHA` fill in ParticleCanvas must use the theme's trail color
     (currently hardcoded `rgba(255,250,242,…)`).
6. **Copy trims** — intro paragraph down to one line; privacy note moves to a
   small footer; the "scatter it with your cursor" caption becomes an in-canvas
   hint that fades out on first pointer interaction.

## Wave 2 — Shareability

7. **Dynamic OG images** — new route `app/api/og/route.tsx` using `ImageResponse`
   (`next/og`), reading the same `a/b/m/p` params. Render the rose curve
   deterministically as SVG dots (reuse `shapeHomePosition` +
   `textToPersonPattern` + `paletteColor` from `lib/particles.ts` — they are
   pure and edge-safe). 1200×630, palette-matched background, the text
   captioned. Wire `generateMetadata` in `app/layout.tsx`/`page.tsx` to point
   og:image at the route with current params (page can stay static; metadata
   can read searchParams — verify against bundled Next 16 docs in
   node_modules/next/dist/docs, APIs may differ from training data).
8. **Download as PNG** — button next to Copy link. Offscreen render at
   1080×1920 (phone wallpaper) with name caption, via existing pure functions;
   `canvas.toBlob` + anchor download. No re-simulation needed — draw particles
   at home positions with slight deterministic scatter.
9. **Record a clip** — `canvas.captureStream(30)` + `MediaRecorder`
   (`video/webm`), 3-second capture of the live canvas, downloads as
   `fractals-of-you.webm`. Feature-detect; hide button when unsupported
   (Safari support varies).

## Wave 3 — Playful extras

10. **"Surprise me" dice button** — fills the input from a curated word list
    ("monsoon", "first coffee", "3am", "grandma's kitchen", …) and generates
    immediately.
11. **Blend mode (compare)** — a "Blend" button in compare mode when both
    shapes exist: both particle sets fly into one shared canvas and interleave
    into a combined shape seeded from `textToPersonPattern(a + " " + b)`.
    Shareable automatically (derived from existing a/b params — no new URL
    state beyond a `view=blend` flag if needed).
12. **Compatibility meter** — deterministic hash of both names → playful
    percentage with label ("cosmic overlap: 73%"). Pure fun, clearly
    tongue-in-cheek styling.
13. **Sound toggle (off by default)** — WebAudio soft plucks on bursts, pitch
    seeded from the text hash. Strictly opt-in; icon button near palette row;
    persist preference in localStorage (not in share URLs).

## Cut-first list (if anything feels like too much)

Sound (13) and compatibility meter (12) are the agreed first cuts.

## Non-goals

- No server-side storage of shapes (URL stays the single source of truth).
- No accounts, no analytics beyond what Vercel provides.
- No custom paid domain (fractalsofyou.vercel.app is the home;
  shapeofyou.vercel.app was taken).

## Architecture notes

- `lib/particles.ts` stays the pure, deterministic core — OG route, PNG
  export, and canvas all consume it. Anything impure (audio, recording,
  pointer state) stays in components.
- `ParticleCanvas.tsx` grows pointer/hold/supernova logic and themed trail +
  additive blending; if it passes ~350 lines, split physics into
  `lib/simulation.ts` (pure step function) and keep the component as the
  DOM/raf shell.
- Page theme mapping lives in `lib/particles.ts` next to PALETTES so palette
  and world theme can't drift apart.
- Per AGENTS.md: this Next.js version has breaking changes — read the guide in
  `node_modules/next/dist/docs/` before using any Next API (especially
  `next/og` / `generateMetadata` in Wave 2).

## Testing/verification

Each wave: `npx tsc --noEmit` + `npm run build` must pass; drive the real app
in a browser (dev server + claude-in-chrome) including a phone-width viewport
for touch checks; verify share URLs round-trip; for Wave 2 validate the OG
route by fetching `/api/og?a=test&p=neon` and eyeballing the PNG. Deploy is
automatic on push to `main`; verify on https://fractalsofyou.vercel.app after
each wave.

## Status ledger (update as work proceeds)

- [x] Deployed to Vercel, GitHub auto-deploy wired (`main` → production)
- [x] Shareable URLs + copy-link button (commit 3be32a4)
- [x] Domain fractalsofyou.vercel.app claimed and serving
- [x] Wave 1 (items 1–6) — shipped 2026-07-07: pointer/touch events, hold-to-attract
  vortex + fling, double-tap supernova, ambient word-demo empty state with
  pattern morphing, WORLD_THEMES palette-matched page (neon additive glow),
  copy trims + in-canvas fading hints. Verified: tsc, prod build, browser
  (all four palettes, burst/vortex/fling/supernova, compare-mode URL
  round-trip, narrow viewport, no horizontal overflow).
  Note for future verification: rAF freezes when the Chrome window is
  occluded — bring the window to the foreground before judging animation.
- [ ] Wave 2 (items 7–9) — deliberately deferred; Wave 3 shipped first by request
- [x] Wave 3 (items 10–13) — shipped 2026-07-07: dice button with curated seeds,
  blend mode (`v=blend` URL flag, seed = `a + " " + b`), order-independent
  compatibility meter, opt-in WebAudio burst chimes (localStorage, never in
  URLs). Verified: tsc, prod build, browser (dice commit + URL sync, blend
  round-trip from fresh load, meter determinism, chime path error-free).
  Post-ship polish (user feedback): action-matched sound design (small tap
  pluck / rising fling whoosh / supernova noise+sub bang), labeled sound
  toggle with enable-confirmation chime, snappier physics (stronger
  spring/repel/bursts, shorter trails), devicePixelRatio-sharp canvas.
