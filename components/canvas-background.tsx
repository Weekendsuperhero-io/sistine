"use client";

import * as React from "react";
import { backdropPalette, type CanvasRamp, type CanvasStyle, createCanvas, useBackdropTint } from "@/lib/canvas-background-utils";
import { readableLightnessBand } from "@/lib/oklch-utils";

interface CanvasBackgroundProps {
  /** Canvas style: gradient | lava | circle. */
  style?: CanvasStyle;
  /** Hue override (deg). When set, drives the canvas color instead of the live --glass-tint-h. */
  hue?: number;
  /** Ramp axis the colors follow (lightness = "linear"). */
  ramp?: CanvasRamp;
  /** Steps per side (4–12). */
  steps?: number;
  /** Gradient angle in degrees (gradient style). */
  angle?: number;
  /** Animation pace (0 = static). */
  speed?: number;
  /** Whether to animate. */
  animated?: boolean;
  /** Seed for deterministic placement. */
  seed?: string;
  className?: string;
  /** Opacity of the background (0–1). */
  opacity?: number;
  /** Blur the canvas. */
  blur?: boolean;
}

export function CanvasBackground({
  style: canvasStyle = "gradient",
  hue,
  ramp = "tonal",
  steps = 6,
  angle = 90,
  speed = 1,
  animated = false,
  seed,
  className = "",
  opacity = 1,
  blur = false,
}: CanvasBackgroundProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const frameRef = React.useRef<number | undefined>(undefined);
  const [dimensions, setDimensions] = React.useState({
    width: 1920,
    height: 1080,
    dpr: 1,
  });
  // Live base color tracks the glass tint, so the canvas recolors with the theme (shared with the
  // CSS gradient background).
  const tint = useBackdropTint();

  React.useEffect(() => {
    const update = () => {
      // Back the canvas at device resolution (capped 2×) so it isn't upscaled/blurry on HiDPI.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      setDimensions({
        width: Math.round(window.innerWidth * dpr),
        height: Math.round(window.innerHeight * dpr),
        dpr,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", {
      colorSpace: "display-p3",
    });
    if (!ctx) return;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Shared with GradientBackground: theme-tracking base + fresco palette (`hue` prop overrides both).
    const { base, frescoColors } = backdropPalette(tint, hue);
    const { step } = createCanvas({
      width: dimensions.width,
      height: dimensions.height,
      dpr: dimensions.dpr,
      color: base,
      colors: frescoColors,
      style: canvasStyle,
      ramp,
      steps,
      // Same readable band the CSS gradient backdrop uses, so switching backgrounds keeps text legible.
      band: tint.fg ? readableLightnessBand(tint.fg, base) : undefined,
      angle,
      speed,
      p3: tint.p3,
      seed: seed || window.location.pathname,
    });

    if (animated && speed > 0) {
      let last = 0;
      const paint = (now: number) => {
        frameRef.current = requestAnimationFrame(paint);
        // ~30fps cap — the gradient repaint / gooey blur are costly and the motion is slow.
        if (now - last < 33) return;
        last = now;
        step(ctx, now / 1000);
      };
      frameRef.current = requestAnimationFrame(paint);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      step(ctx, 0);
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [
    dimensions,
    tint,
    hue,
    canvasStyle,
    ramp,
    steps,
    angle,
    speed,
    animated,
    seed,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 glass-backdrop-layer pointer-events-none ${className}`}
      style={{
        opacity,
        filter: blur ? "blur(20px)" : "none",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}
