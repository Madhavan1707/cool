# The World — 3D Monument & Later Phases (v1 shipped 2026-07-19)

Approved by Madhavan on 2026-07-19 ("orbit it" + "a world", solo/stateless,
"start with the implementation, we can do docs later"). Written after v1
shipped; records the design as built and the phases deliberately deferred.

## Context

Every shape in Fractals of You is a fact: the same seed always finds the same
rose curve (`lib/particles.ts`). v1 of the world extends that fact into a third
dimension without ever generating anything new — the 3D monument *is* the 2D
shape, revealed from another angle.

## As built (v1)

- **The lift (`lib/world.ts`).** x/z come straight from `shapeHomePosition`;
  elevation is the same wobble wave that bends the 2D outline, plus seeded
  jitter. Looking straight down at the monument reproduces the 2D shape
  exactly, by construction — no tuning, no second generator.
- **The scene (`components/ShapeWorld.tsx`).** Vanilla three.js (the repo's
  only new dependency), lazy-loaded via `next/dynamic` so the front door ships
  zero extra bytes. One dynamic `THREE.Points` for the living monument(s), a
  ground-cast shadow that is literally the 2D shape and reacts to bursts, five
  nearest-miss monuments dimmed on a fogged horizon ring
  (`nearestMisses` + `missPlacements`), grid plane, accent glow, theme-matched
  fog. ~5 draw calls, DPR clamped to 2.
- **The entry shot.** Camera starts top-down — the shape the visitor already
  knows — then pulls back over 2.4s as the flat thing rises into a monument.
  The choreography clock starts on the first *rendered* frame, so a link
  opened in a background tab saves the reveal for when it's actually seen.
  Reduced motion: world starts assembled, no auto-drift.
- **Play.** One-finger orbit with inertia, pinch/wheel zoom, tap burst,
  double-tap supernova (physics ported from `ParticleCanvas` constants,
  rescaled px → world units), seed-pitched chimes, idle drift.
- **Share.** `w=1` in the URL drops a visitor straight into the world;
  compare mode renders both monuments, blend renders the merged seed's one.

## Later phases (agreed, not yet built)

Ordered by expected payoff. Each is independently shippable.

### Phase 2 — Walk to a nearest miss

Tap a horizon monument and the camera travels to it; your monument recedes
into the fog behind you. The certificate's claim — nothing one keystroke away
is you — becomes something you physically cross the plane to check. The
caption swaps to the miss's string and address during the visit, with a
"return to yours" affordance. All data already exists (`nearestMisses`,
`textToPersonPattern`, `missPlacements`); the work is camera choreography,
target switching, and making the visited miss brighten from its dimmed state.

### Phase 3 — The entry shot, recordable

The top-down pull-back is the single most giffable moment in the app. Add a
"replay the reveal" control inside the world and wire it into the existing
clip-recording machinery (`RecordClipButton` captures a canvas stream; the
WebGL canvas needs `preserveDrawingBuffer` or a `captureStream` path checked
on mobile Safari). Success: one tap yields a shareable clip of the shape
rising from its own shadow.

### Phase 4 — OG image for world links

`/api/og` currently renders the 2D shape for all links. When `w=1` is
present, render a 3/4-angle impression of the monument (a static projection
of the lifted points is enough — no three.js on the server; project x/y/z
with the entry camera's final matrix and draw discs). Link previews then
match what the link actually opens into.

### Phase 5 — Hold-attract in 3D

Dropped from v1 because it fights orbit-drag. Resolvable gesture arbitration:
hold *on the monument* (raycast hit within ~1.2 units of a monument center)
= attract vortex; hold on empty plane = orbit. Port `ATTRACT_*` / `FLING_*`
constants the same way the burst constants were ported.

### Someday / explicitly out of scope for now

- **The shared garden** (the 10x dream from the session): a persistent public
  plane where every visitor's shape remains. Needs storage, rate limiting,
  and moderation — people will type slurs and those become public monuments.
  Revisit only when the solo world has proven people linger.
- **Roaming** (WASD/joystick movement): the world is plane + fog + horizon
  for now; movement is the camera orbit. Phase 2's travel-to-a-miss covers
  the "go somewhere" itch without free movement's control surface.
- **Postprocessing bloom / heavy shaders**: the mobile budget (mid-range
  phones, single draw call for the monument) rules these out; the additive
  blending on dark themes already reads as glow.

## Verification notes (v1)

Driven end-to-end in Chrome: entry, orbit, burst, supernova, close,
`w=1` deep links (neon, ocean compare), small viewport. Zero console errors.
One operational gotcha recorded for future sessions: Chrome suspends
`requestAnimationFrame` in hidden tabs, so automated verification of the
world must keep the tab focused or physics appears frozen in slow motion —
check `document.visibilityState` before diagnosing a freeze.
