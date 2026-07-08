"use client";

import { useEffect, useRef } from "react";
import { shapeHomePosition, textToPersonPattern } from "@/lib/particles";

/**
 * A still, single-colour rendering of a shape's resting curve — home positions
 * only, no simulation or animation loop. Used for the "nearest miss" ghosts and
 * for the candidates/landed shape in the reveal sequence.
 */
export default function StillShape({
  seed,
  size,
  color,
  maxDots = 220,
  dotRadius,
  className,
}: {
  seed: string;
  size: number;
  color: string;
  maxDots?: number;
  dotRadius?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size, size);

    const pattern = textToPersonPattern(seed);
    const dots = Math.min(pattern.particleCount, maxDots);
    const radius = dotRadius ?? Math.max(1, size / 66);
    context.fillStyle = color;
    for (let i = 0; i < dots; i++) {
      const home = shapeHomePosition(i / dots, size, pattern.shape);
      context.beginPath();
      context.arc(home.x, home.y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }, [seed, size, color, maxDots, dotRadius]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}
