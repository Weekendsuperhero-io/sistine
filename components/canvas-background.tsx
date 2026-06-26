"use client";

import * as React from "react";
import { type CanvasRamp, type CanvasStyle, createCanvas, FRESCO_HUES } from "@/lib/canvas-background-utils";

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
  // Live base color tracks the glass tint, so the canvas recolors with the theme (like the CSS
  // gradient background).
  const [tint, setTint] = React.useState<{
    hue: number;
    dark: boolean;
    preset: string | undefined;
  }>({
    hue: 250,
    dark: true,
    preset: undefined,
  });

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
    const root = document.documentElement;
    const read = () => {
      const v = Number.parseFloat(getComputedStyle(root).getPropertyValue("--glass-tint-h"));
      const next = {
        hue: Number.isFinite(v) ? v : 250,
        dark: root.classList.contains("dark"),
        preset: root.dataset.glassTint,
      };
      setTint((prev) => (prev.hue === next.hue && prev.dark === next.dark && prev.preset === next.preset ? prev : next));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "class",
        "data-glass-tint",
        "style",
      ],
    });
    return () => observer.disconnect();
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

    const p3 = window.matchMedia?.("(color-gamut: p3)").matches ?? false;
    // Center color tracks the theme so it doesn't blast bright on dark / wash out on light.
    const base = {
      l: tint.dark ? 52 : 72,
      c: 0.15,
      h: hue ?? tint.hue,
    };
    // A fresco tint (sistine/muse/…) feeds its multi-hue palette at the canvas's standard L/C, so the
    // canvas matches the fresco glass instead of using just its base hue. The `hue` prop override wins.
    const frescoHues = hue == null && tint.preset ? FRESCO_HUES[tint.preset] : undefined;
    const colors = frescoHues?.map((h) => `oklch(${tint.dark ? 52 : 72}% 0.15 ${h})`);
    const { step } = createCanvas({
      width: dimensions.width,
      height: dimensions.height,
      dpr: dimensions.dpr,
      color: base,
      colors,
      style: canvasStyle,
      ramp,
      steps,
      angle,
      speed,
      p3,
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
      className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
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
