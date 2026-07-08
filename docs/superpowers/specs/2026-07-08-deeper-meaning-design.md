# Deeper Meaning — Address & Nearest Misses (Approach A + C, shipped 2026-07-08)

Approved by Madhavan on 2026-07-08 (address style "mix of 1 and 2"; "A + C";
"start with the implementation, docs later"). This doc is written after the
work shipped, so it records the design as built.

## Context

Fractals of You (https://fractalsofyou.vercel.app) turns typed text into a
deterministic particle shape — a rose curve whose parameters come from FNV-1a
hashes of the text (`lib/particles.ts`). Same input, same shape, forever.

The inspiration was Slice of Pi (https://slice-of-pi.vercel.app), whose depth
comes from *proving a claim with your own input*: your digits already live
somewhere in pi, so "everything is already written." Fractals of You had the
machinery to prove a claim of its own but never stated one — the site was
pretty, not meaningful.

## The meaning

We chose a combination the generator can prove honestly, and which is more
affirming than pi's "nothing is original":

> In a space too vast to picture, exactly one form was always yours — waiting
> for the word that points to it. And nothing else, not even the shape one
> keystroke away, is you.

Two true claims, each provable from the existing pure functions:

- **You were always here (#1).** Typing doesn't *build* a shape; it reads out
  an address that already existed. Every string maps to a fingerprint of 13
  independent 32-bit hash coordinates (~2^416 ≈ 10^125 possibilities — more
  than a googol, more than the ~10^80 atoms in the observable universe). The
  space is complete before anyone looks; the word just points into it.
- **Exactly one you (#4).** Because the parameters are hashed, the shape one
  keystroke away shares nothing with yours (avalanche). The address is not only
  pre-existing but singular and fragile — the nearest possible miss is a
  stranger.

The address proves #1; the nearest misses prove #4. Both are pure and edge-safe.

## Approaches considered

- **A — The Address (chosen).** A calm "specimen card" under the shape: its
  permanent address, a one-line scale fact, and an expander of one-keystroke
  neighbours. Honest, on-brand, built from existing pure functions.
- **B — Wander the space (deferred).** A scrubber that morphs continuously
  through all shapes, snapping "you are here" at your address. Most visceral,
  but the biggest lift (smooth morphing across integer petal counts). Left as a
  later layer.
- **C — Found, not made (chosen).** Reframe the core loop as retrieval: "Find
  yours" plus a riffle-and-land beat on submit. Delivers A's meaning through
  interaction language.

Shipped: **A + C.** B deferred.

## Design as built

### Address (`shapeAddress` in `lib/particles.ts`)

Pure function returning two honest slices of the same hashes that build the
pattern, in the "mix of styles 1 and 2" the user picked:

```
FORM No. K7QN·3F2M
14ʰ32ᵐ · +82°41′ · in the space of all shapes
```

- **Catalog** — two Crockford base-32 groups (no I/L/O/U, so an address never
  reads as a typo of itself): the archival "already indexed" register.
- **Coordinate** — right-ascension/declination *notation* (`hash % 24` hours,
  `% 60` minutes; `% 90` degrees with sign, `% 60` arcminutes) rendering a
  point. The "in the space of all shapes" label anchors it as an abstract
  coordinate, not an astronomical one — which keeps the celestial notation
  honest.

### Specimen card (`components/ShapeCertificate.tsx`)

Presentational. Under the address:

- Framing: *"always here — you found this shape, you didn't make it"* (blend
  mode overrides this to *"a form that is neither of you — only here when
  you're together"*).
- Scale: *"one of more than a googol possible forms"*, with a hover title
  giving the exact honest figure (13 coordinates × 32 bits).
- `compact` variant (two-up compare) drops everything but the two address
  lines, so a full card per column doesn't crowd the page.
- Fades in on mount, so it resolves as the shape lands rather than popping.

### Nearest misses (`nearestMisses` + expander)

Behind a quiet *"see who you're not →"* toggle. `nearestMisses(text)` returns
the strings one keystroke away — a substitution, an adjacent swap, a deletion,
a doubled letter — deduped and ordered by a stable hash key, so the same input
always surfaces the same neighbours (they are fixed facts, not a shuffle).
`Array.from` keeps emoji/surrogate pairs whole. Each renders as a small, still,
single-colour "ghost" (home positions only, no animation loop, dimmed to
`inkFaint`) under *"one keystroke away — and not one of them is you."*

### Found, not made (`useRiffle` in `app/home.tsx`)

"Generate" → **"Find yours."** On a fresh Find the canvas flashes through a few
random patterns (durations easing slower into the landing) and settles on the
real one; the existing spring physics turns each pattern swap into a morph —
the same machinery the ambient demo already uses to cycle words — so this is
just fast cycling, no physics change. The first flash is synchronous so the
answer never shows through the committing render. Skipped under
`prefers-reduced-motion`. Header copy becomes: *"Type anything. Somewhere in a
space larger than the universe, one shape was already yours — this finds it."*

## Architecture

Preserves the pure-core / impure-shell split:

- `lib/particles.ts` — new pure `shapeAddress` and `nearestMisses` (plus a
  private `base32`/`shiftChar`). No I/O, edge-safe, reusable by OG/PNG later.
- `components/ShapeCertificate.tsx` — the card, the expander, and a small
  still-render `MiniShape` (home positions only).
- `app/home.tsx` — the `useRiffle` hook and wiring; a `certificateMode`
  ("full" | "compact" | "none") prop on `PersonFractal`; blend framing on
  `BlendView`; copy/verb changes.

## Non-goals (unchanged)

- No server storage; the URL stays the single source of truth. The address is
  derived on the fly, never stored.
- No accounts, no analytics beyond Vercel's.

## Deferred / optional

- **B — wander the space** (the scrubbable continuum).
- Stamping the address into the PNG wallpaper / OG image caption (both already
  draw captions, so this is cheap when wanted).
- Making the nearest misses clickable ("go meet the stranger").

## Verification

- `npx tsc --noEmit` and `next build` both clean.
- Drove the real app (dev server + claude-in-chrome): full card in single mode;
  distinct ghosts in the misses expander; compact addresses under each column
  in two-up compare; riffle-and-land on a fresh Find; blend framing wired.
- Addresses confirmed deterministic and distinct across seeds
  (madhavan → R55Y·WZXB, serendipity → TT3A·AD7N, alice → ZR3M·1GSF,
  bob → XZ5Z·0RHC).

## Status ledger

- [x] `shapeAddress` + `nearestMisses` pure functions (`lib/particles.ts`)
- [x] `ShapeCertificate` component (card, scale line, misses expander, ghosts)
- [x] `useRiffle` found-not-made beat + "Find yours" verb + header copy
- [x] Certificate wired: single (full), compare (compact ×2), blend (framed)
- [x] tsc + build clean; browser-verified; addresses deterministic
- [ ] Approach B — wander the space (deferred)
- [ ] Address stamp on PNG/OG caption (optional)
