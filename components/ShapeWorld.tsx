"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  PaletteId,
  PersonPattern,
  WORLD_THEMES,
  flowAngle,
  nearestMisses,
  shapeAddress,
  textToPersonPattern,
} from "@/lib/particles";
import { WorldShape, buildWorldShape, missPlacements } from "@/lib/world";
import { useReducedMotion } from "@/components/useReducedMotion";
import type { BurstKind } from "@/components/sound";

interface ShapeWorldProps {
  /** Primary seed (already blended upstream when blend view is active). */
  seedA: string;
  /** Optional companion monument (compare mode). */
  seedB?: string | null;
  palette: PaletteId;
  /** Caption under the address line, e.g. `"maya" & "arun"`. */
  label: string;
  onClose: () => void;
  onBurst?: (kind: BurstKind) => void;
}

// ——— World layout (world units; the shape curve has radius ~1) ———
const HOVER_Y = 1.7; // how high monuments float above the plane
const FRIEND_OFFSET_X = 2.9; // companion monument's distance from the primary
const MISS_COUNT = 5;
const MISS_HOVER_RATIO = 0.8; // horizon monuments float a little lower
const MISS_BRIGHTNESS = 0.6; // horizon monuments render dimmed

// ——— Physics: the 2D canvas constants, rescaled from px to world units ———
const SPRING_STRENGTH = 4.2; // per second (unitless), same as 2D
const JITTER_SPEED = 0.03;
const BURST_RADIUS = 0.85;
const BURST_STRENGTH = 10;
const BURST_DURATION_MS = 450;
const SUPERNOVA_RADIUS = 6;
const SUPERNOVA_STRENGTH = 15;
const SUPERNOVA_DURATION_MS = 800;
const MAX_ACTIVE_BURSTS = 5;

// ——— Gestures ———
const TAP_MAX_MS = 350;
const TAP_MAX_DRAG_PX = 8;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_DIST_PX = 48;
const ORBIT_SPEED = 0.006; // radians per dragged px
const ORBIT_DECAY = 4; // inertia decay per second
const IDLE_DRIFT = 0.05; // radians per second of slow auto-orbit
const POLAR_MIN = 0.18;
const POLAR_MAX = 1.42;
const RADIUS_MIN = 2.6;
const RADIUS_MAX = 10;
const ENTRY_MS = 2400;

interface Burst3D {
  x: number;
  y: number;
  z: number;
  time: number;
  radius: number;
  strength: number;
  duration: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Soft round sprite so points render as glowing discs instead of squares. */
function makeDiscTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.85)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Radial glow laid on the ground beneath the primary monument. */
function makeGlowTexture(accent: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, accent);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.globalAlpha = 0.35;
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** sRGB 0-1 → linear, so the renderer's output conversion lands back on the palette color. */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export default function ShapeWorld({
  seedA,
  seedB,
  palette,
  label,
  onClose,
  onBurst,
}: ShapeWorldProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [interacted, setInteracted] = useState(false);
  const reducedMotion = useReducedMotion();
  // Latest callbacks, readable from inside the long-lived scene effect
  // without tearing the scene down when they change identity.
  const onBurstRef = useRef(onBurst);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onBurstRef.current = onBurst;
    onCloseRef.current = onClose;
  }, [onBurst, onClose]);

  const address = shapeAddress(seedA);
  const theme = WORLD_THEMES[palette];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
      // The close button is the dialog's only tabbable control; keeping Tab
      // on it stops keyboard focus wandering the occluded page behind.
      if (e.key === "Tab") {
        e.preventDefault();
        closeButtonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Modal focus contract: focus moves in on open, back out on close.
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const theme = WORLD_THEMES[palette];
    const fogColor = new THREE.Color(
      theme.trail[0] / 255,
      theme.trail[1] / 255,
      theme.trail[2] / 255
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    scene.background = fogColor;
    scene.fog = new THREE.FogExp2(fogColor, 0.075);

    const camera = new THREE.PerspectiveCamera(
      58,
      mount.clientWidth / mount.clientHeight,
      0.1,
      80
    );

    const disposables: { dispose(): void }[] = [];
    const discTexture = makeDiscTexture();
    disposables.push(discTexture);

    // ——— The living monument(s): one merged geometry, one draw call ———
    const patternA = textToPersonPattern(seedA);
    const shapeA = buildWorldShape(seedA, patternA, palette);
    let patternB: PersonPattern | null = null;
    let shapeB: WorldShape | null = null;
    if (seedB) {
      patternB = textToPersonPattern(seedB);
      shapeB = buildWorldShape(seedB, patternB, palette);
    }

    const liveCount = shapeA.count + (shapeB?.count ?? 0);
    const homes = new Float32Array(liveCount * 3);
    const live = new Float32Array(liveCount * 3);
    const liveColors = new Float32Array(liveCount * 3);

    function placeShape(shape: WorldShape, offsetIndex: number, offsetX: number) {
      for (let i = 0; i < shape.count; i++) {
        const base = (offsetIndex + i) * 3;
        homes[base] = shape.positions[i * 3] + offsetX;
        homes[base + 1] = shape.positions[i * 3 + 1] + HOVER_Y;
        homes[base + 2] = shape.positions[i * 3 + 2];
        liveColors[base] = srgbToLinear(shape.colors[i * 3]);
        liveColors[base + 1] = srgbToLinear(shape.colors[i * 3 + 1]);
        liveColors[base + 2] = srgbToLinear(shape.colors[i * 3 + 2]);
      }
    }
    placeShape(shapeA, 0, 0);
    if (shapeB) placeShape(shapeB, shapeA.count, FRIEND_OFFSET_X);

    // Particles assemble on entry: scattered across the sky, springing home.
    // Under reduced motion the monument is simply there.
    for (let i = 0; i < liveCount; i++) {
      if (reducedMotion) {
        live[i * 3] = homes[i * 3];
        live[i * 3 + 1] = homes[i * 3 + 1];
        live[i * 3 + 2] = homes[i * 3 + 2];
      } else {
        live[i * 3] = (Math.random() - 0.5) * 10;
        live[i * 3 + 1] = HOVER_Y + Math.random() * 5;
        live[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
    }

    const liveGeometry = new THREE.BufferGeometry();
    const livePositionAttr = new THREE.BufferAttribute(live, 3);
    livePositionAttr.setUsage(THREE.DynamicDrawUsage);
    liveGeometry.setAttribute("position", livePositionAttr);
    liveGeometry.setAttribute("color", new THREE.BufferAttribute(liveColors, 3));
    const liveMaterial = new THREE.PointsMaterial({
      size: 0.055,
      map: discTexture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: theme.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const livePoints = new THREE.Points(liveGeometry, liveMaterial);
    // The cloud scatters well past the curve during bursts; skip culling math.
    livePoints.frustumCulled = false;
    scene.add(livePoints);
    disposables.push(liveGeometry, liveMaterial);

    // ——— The shadow: the 2D shape itself, cast on the ground and tracking
    // every burst. Ink over light themes reads as shadow; over dark, as a
    // faint reflection. ———
    const shadow = new Float32Array(liveCount * 3);
    const shadowGeometry = new THREE.BufferGeometry();
    const shadowPositionAttr = new THREE.BufferAttribute(shadow, 3);
    shadowPositionAttr.setUsage(THREE.DynamicDrawUsage);
    shadowGeometry.setAttribute("position", shadowPositionAttr);
    const shadowMaterial = new THREE.PointsMaterial({
      size: 0.05,
      map: discTexture,
      color: new THREE.Color(theme.ink),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const shadowPoints = new THREE.Points(shadowGeometry, shadowMaterial);
    shadowPoints.frustumCulled = false;
    scene.add(shadowPoints);
    disposables.push(shadowGeometry, shadowMaterial);

    // ——— The horizon: monuments of the nearest misses, one keystroke away.
    // Static, dimmed, half-swallowed by fog — the rest of the space of all
    // shapes, populated without a single other user existing. ———
    const misses = missPlacements(nearestMisses(seedA, MISS_COUNT));
    const missShapes = misses.map((m) =>
      buildWorldShape(m.seed, textToPersonPattern(m.seed), palette, MISS_BRIGHTNESS)
    );
    const missCount = missShapes.reduce((sum, s) => sum + s.count, 0);
    const missPositions = new Float32Array(missCount * 3);
    const missColors = new Float32Array(missCount * 3);
    let missOffset = 0;
    misses.forEach((placement, index) => {
      const shape = missShapes[index];
      for (let i = 0; i < shape.count; i++) {
        const base = (missOffset + i) * 3;
        missPositions[base] = shape.positions[i * 3] + placement.x;
        missPositions[base + 1] =
          shape.positions[i * 3 + 1] + HOVER_Y * MISS_HOVER_RATIO;
        missPositions[base + 2] = shape.positions[i * 3 + 2] + placement.z;
        missColors[base] = srgbToLinear(shape.colors[i * 3]);
        missColors[base + 1] = srgbToLinear(shape.colors[i * 3 + 1]);
        missColors[base + 2] = srgbToLinear(shape.colors[i * 3 + 2]);
      }
      missOffset += shape.count;
    });
    const missGeometry = new THREE.BufferGeometry();
    missGeometry.setAttribute("position", new THREE.BufferAttribute(missPositions, 3));
    missGeometry.setAttribute("color", new THREE.BufferAttribute(missColors, 3));
    const missMaterial = new THREE.PointsMaterial({
      size: 0.05,
      map: discTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: theme.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    scene.add(new THREE.Points(missGeometry, missMaterial));
    disposables.push(missGeometry, missMaterial);

    // ——— The plane: a fine grid fading into fog, plus a soft accent glow
    // under the monument. ———
    const grid = new THREE.GridHelper(
      120,
      120,
      new THREE.Color(theme.inkFaint),
      new THREE.Color(theme.inkFaint)
    );
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.28;
    gridMaterial.depthWrite = false;
    scene.add(grid);
    disposables.push(grid.geometry as THREE.BufferGeometry, gridMaterial);

    const glowTexture = makeGlowTexture(theme.accent);
    const glowMaterial = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), glowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    scene.add(glow);
    disposables.push(glow.geometry, glowMaterial, glowTexture);

    // ——— Camera rig: spherical orbit around the monument(s) ———
    const target = new THREE.Vector3(seedB ? FRIEND_OFFSET_X / 2 : 0, HOVER_Y * 0.85, 0);
    const entryFrom = { polar: 0.02, radius: 12, azimuth: -0.55 };
    const entryTo = { polar: 1.02, radius: seedB ? 6 : 4.8, azimuth: 0 };
    // Reduced motion skips the pull-back and starts at the final pose.
    const entryPose = reducedMotion ? entryTo : entryFrom;
    const orbit = {
      azimuth: entryPose.azimuth,
      polar: entryPose.polar,
      radius: entryPose.radius,
      azimuthVel: 0,
      polarVel: 0,
    };
    // Set on the first rendered frame, not at mount: rAF is suspended in
    // hidden tabs, so a world link opened in the background would otherwise
    // play its entry choreography unseen before the visitor switches over.
    let entryStart = 0;
    let entryDone = reducedMotion;

    function applyCamera() {
      const sinP = Math.sin(orbit.polar);
      camera.position.set(
        target.x + orbit.radius * sinP * Math.sin(orbit.azimuth),
        target.y + orbit.radius * Math.cos(orbit.polar),
        target.z + orbit.radius * sinP * Math.cos(orbit.azimuth)
      );
      camera.lookAt(target);
    }
    applyCamera();

    // ——— Gestures: one finger orbits, pinch/wheel zooms, tap bursts,
    // double-tap goes supernova. ———
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;
    let downInfo: { x: number; y: number; time: number; moved: boolean } | null = null;
    let lastTap: { x: number; y: number; time: number } | null = null;
    const bursts: Burst3D[] = [];
    const raycaster = new THREE.Raycaster();
    const tapPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -HOVER_Y);
    const tapPoint = new THREE.Vector3();

    function markInteracted() {
      setInteracted(true);
      if (!entryDone) {
        // A touch mid-flight hands over control immediately.
        orbit.polar = entryTo.polar;
        orbit.radius = entryTo.radius;
        orbit.azimuth = entryTo.azimuth;
        entryDone = true;
      }
    }

    function addBurst(burst: Burst3D) {
      bursts.push(burst);
      if (bursts.length > MAX_ACTIVE_BURSTS) bursts.shift();
    }

    function onPointerDown(e: PointerEvent) {
      markInteracted();
      renderer.domElement.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        pinchDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      }
      downInfo = { x: e.clientX, y: e.clientY, time: performance.now(), moved: false };
      orbit.azimuthVel = 0;
      orbit.polarVel = 0;
    }

    function onPointerMove(e: PointerEvent) {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (pinchDistance > 0) {
          orbit.radius = THREE.MathUtils.clamp(
            orbit.radius * (pinchDistance / dist),
            RADIUS_MIN,
            RADIUS_MAX
          );
        }
        pinchDistance = dist;
        if (downInfo) downInfo.moved = true;
        return;
      }

      if (downInfo) {
        if (
          Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) > TAP_MAX_DRAG_PX
        ) {
          downInfo.moved = true;
        }
        orbit.azimuth -= dx * ORBIT_SPEED;
        orbit.polar = THREE.MathUtils.clamp(
          orbit.polar - dy * ORBIT_SPEED,
          POLAR_MIN,
          POLAR_MAX
        );
        orbit.azimuthVel = -dx * ORBIT_SPEED * 60;
        orbit.polarVel = -dy * ORBIT_SPEED * 60;
      }
    }

    function onPointerUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      pinchDistance = 0;
      const info = downInfo;
      downInfo = null;
      if (!info || info.moved) return;
      const now = performance.now();
      if (now - info.time > TAP_MAX_MS) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(tapPlane, tapPoint)) return;

      const isDoubleTap =
        lastTap !== null &&
        now - lastTap.time < DOUBLE_TAP_MS &&
        Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_DIST_PX;
      if (isDoubleTap) {
        lastTap = null;
        addBurst({
          x: tapPoint.x, y: tapPoint.y, z: tapPoint.z,
          time: now,
          radius: SUPERNOVA_RADIUS,
          strength: SUPERNOVA_STRENGTH,
          duration: SUPERNOVA_DURATION_MS,
        });
        onBurstRef.current?.("supernova");
      } else {
        lastTap = { x: e.clientX, y: e.clientY, time: now };
        addBurst({
          x: tapPoint.x, y: tapPoint.y, z: tapPoint.z,
          time: now,
          radius: BURST_RADIUS,
          strength: BURST_STRENGTH,
          duration: BURST_DURATION_MS,
        });
        onBurstRef.current?.("tap");
      }
    }

    function onPointerCancel(e: PointerEvent) {
      pointers.delete(e.pointerId);
      pinchDistance = 0;
      downInfo = null;
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      markInteracted();
      orbit.radius = THREE.MathUtils.clamp(
        orbit.radius * (1 + e.deltaY * 0.001),
        RADIUS_MIN,
        RADIUS_MAX
      );
    }

    const el = renderer.domElement;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("wheel", onWheel, { passive: false });

    function onResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener("resize", onResize);

    // ——— Frame loop: entry choreography, orbit inertia, ported physics ———
    let rafId = 0;
    let lastTime = performance.now();

    function frame(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const t = now / 1000;

      if (!entryDone) {
        if (entryStart === 0) entryStart = now;
        const progress = Math.min(1, (now - entryStart) / ENTRY_MS);
        const eased = easeInOutCubic(progress);
        orbit.polar = THREE.MathUtils.lerp(entryFrom.polar, entryTo.polar, eased);
        orbit.radius = THREE.MathUtils.lerp(entryFrom.radius, entryTo.radius, eased);
        orbit.azimuth = THREE.MathUtils.lerp(entryFrom.azimuth, entryTo.azimuth, eased);
        if (progress >= 1) entryDone = true;
      } else if (pointers.size === 0) {
        orbit.azimuth += orbit.azimuthVel * dt;
        orbit.polar = THREE.MathUtils.clamp(
          orbit.polar + orbit.polarVel * dt,
          POLAR_MIN,
          POLAR_MAX
        );
        const decay = Math.exp(-ORBIT_DECAY * dt);
        orbit.azimuthVel *= decay;
        orbit.polarVel *= decay;
        if (!reducedMotion) orbit.azimuth += IDLE_DRIFT * dt;
      }
      applyCamera();

      for (let i = bursts.length - 1; i >= 0; i--) {
        if (now - bursts[i].time >= bursts[i].duration) bursts.splice(i, 1);
      }

      for (let i = 0; i < liveCount; i++) {
        const base = i * 3;
        const px = live[base];
        const py = live[base + 1];
        const pz = live[base + 2];

        let vx = (homes[base] - px) * SPRING_STRENGTH;
        let vy = (homes[base + 1] - py) * SPRING_STRENGTH;
        let vz = (homes[base + 2] - pz) * SPRING_STRENGTH;

        if (!reducedMotion) {
          // Same ambient flow-field wobble as 2D, applied in the ground plane
          // with a gentle vertical bob.
          const jitterAngle = flowAngle(px, pz, t, patternA.flow);
          vx += Math.cos(jitterAngle) * JITTER_SPEED;
          vz += Math.sin(jitterAngle) * JITTER_SPEED;
          vy += Math.sin(jitterAngle * 2 + i) * JITTER_SPEED * 0.5;
        }

        for (let b = 0; b < bursts.length; b++) {
          const burst = bursts[b];
          const dx = px - burst.x;
          const dy = py - burst.y;
          const dz = pz - burst.z;
          // Squared-distance early-out: most particles are outside most
          // bursts, so skip the sqrt unless it actually applies force.
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq >= burst.radius * burst.radius || distSq < 1e-6) continue;
          const dist = Math.sqrt(distSq);
          const decay = 1 - (now - burst.time) / burst.duration;
          const force = ((burst.radius - dist) / burst.radius) * burst.strength * decay;
          vx += (dx / dist) * force;
          vy += (dy / dist) * force;
          vz += (dz / dist) * force;
        }

        const nx = px + vx * dt;
        const ny = Math.max(0.05, py + vy * dt);
        const nz = pz + vz * dt;
        live[base] = nx;
        live[base + 1] = ny;
        live[base + 2] = nz;
        shadow[base] = nx;
        shadow[base + 1] = 0.02;
        shadow[base + 2] = nz;
      }
      livePositionAttr.needsUpdate = true;
      shadowPositionAttr.needsUpdate = true;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("wheel", onWheel);
      for (const d of disposables) d.dispose();
      // Release the WebGL context deterministically — browsers cap live
      // contexts (~8-16), and closed worlds would otherwise hold theirs
      // until GC gets around to it.
      renderer.forceContextLoss();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [seedA, seedB, palette, reducedMotion]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`3D world of ${label}`}
      aria-describedby="shape-world-instructions"
      className="fixed inset-0 z-50"
      style={{ backgroundColor: `rgb(${theme.trail.join(",")})` }}
    >
      <p id="shape-world-instructions" className="sr-only">
        A 3D scene of your shape floating above a plane. Drag to orbit, pinch
        or scroll to zoom, tap to burst particles, double-tap for a supernova.
        Press Escape to leave.
      </p>

      <div ref={mountRef} className="absolute inset-0" />

      <button
        ref={closeButtonRef}
        onClick={onClose}
        aria-label="Leave the world"
        title="Leave the world"
        className="absolute top-4 right-4 inline-flex items-center justify-center rounded-full p-3 bg-[color:var(--surface)] backdrop-blur-sm border border-[color:var(--border)] shadow-sm hover:border-[color:var(--ink-faint)] active:scale-95 transition text-[color:var(--ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ring-offset)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div
        aria-hidden
        className={`absolute top-5 inset-x-0 flex justify-center pointer-events-none transition-opacity duration-700 ${
          interacted ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="bg-[color:var(--surface)] backdrop-blur-sm border border-[color:var(--border)] rounded-full px-3 py-1 text-xs text-[color:var(--ink-soft)]">
          drag to orbit · pinch to zoom · tap to burst · double-tap for supernova
        </span>
      </div>

      <div className="absolute bottom-5 left-5 pointer-events-none select-none">
        <p className="text-sm font-medium text-[color:var(--ink)]">{label}</p>
        <p className="text-xs text-[color:var(--ink-soft)]">
          {address.catalog} · {address.coordinate}
        </p>
        <p className="mt-1 text-xs text-[color:var(--ink-faint)]">
          the shapes one keystroke away drift at the horizon
        </p>
      </div>
    </div>
  );
}
