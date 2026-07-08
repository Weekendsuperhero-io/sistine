"use client";

import * as React from "react";
import { FRESCO_HUES } from "@/lib/canvas-background-utils";
import { type GradientGeometry, type GradientShape, type RampGradientAxis, rampGradient, wrapGradient } from "@/lib/oklch-utils";

/**
 * A ramp-driven gradient wallpaper. The gradient is one of our oklch ramps (hue / lightness / tonal
 * / chroma) centered on the live glass-tint color (so it recolors with the theme) with the center as a
 * slightly wider plateau, painted as a `linear`, `radial`, or `conic` gradient. Pure CSS — crisp at any DPI.
 */
export function GradientBackground({
  axis = "tonal",
  hue,
  angle = 90,
  shape = "linear",
  position,
  radialShape,
  radialSize,
}: {
  axis?: RampGradientAxis;
  /** Hue override (deg). When set, drives the gradient color instead of the live --glass-tint-h. */
  hue?: number;
  angle?: number;
  shape?: GradientShape;
} & GradientGeometry) {
  const [{ hue: tintHue, dark, p3, preset }, setState] = React.useState<{
    hue: number;
    dark: boolean;
    p3: boolean;
    preset: string | undefined;
  }>({
    hue: 250,
    dark: true,
    p3: false,
    preset: undefined,
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const cs = getComputedStyle(root);
      const acc = Number.parseFloat(cs.getPropertyValue("--accent-h"));
      // Honor the accent hue when the accent knob is on, else the live tint hue.
      const v = Number.isFinite(acc) ? acc : Number.parseFloat(cs.getPropertyValue("--glass-tint-h"));
      const next = {
        hue: Number.isFinite(v) ? v : 250,
        dark: root.classList.contains("dark"),
        p3: window.matchMedia?.("(color-gamut: p3)").matches ?? false,
        preset: root.dataset.glassTint,
      };
      setState((prev) => (prev.hue === next.hue && prev.dark === next.dark && prev.p3 === next.p3 && prev.preset === next.preset ? prev : next));
    };
    read();
    // Recolor on theme (class) + tint (preset attribute / custom inline vars) changes.
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

  // Center lightness tracks the theme so it doesn't blast bright on dark / wash out on light. A fresco
  // tint lays its multi-hue palette across the gradient (same L/C) so it matches the fresco glass.
  const l = dark ? 52 : 72;
  // An explicit `hue` prop overrides the fresco palette + live tint (mirrors CanvasBackground's `hue`).
  const frescoHues = hue == null && preset ? FRESCO_HUES[preset] : undefined;
  const gradient = frescoHues
    ? wrapGradient(shape, frescoHues.map((h) => `oklch(${l}% 0.15 ${h})`).join(", "), {
        angle,
        position,
        radialShape,
        radialSize,
      })
    : rampGradient(
        axis,
        {
          l,
          c: 0.15,
          h: hue ?? tintHue,
        },
        5,
        {
          angle,
          gamut: p3 ? "p3" : "srgb",
          shape,
          position,
          radialShape,
          radialSize,
        },
      );

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none transition-[background] duration-500"
      style={{
        background: gradient,
      }}
    >
      {/* Subtle organic highlight/shadow for depth on top of the flat ramp. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 25%, oklch(var(--shadow-highlight) / 0.12) 0%, transparent 45%), radial-gradient(circle at 80% 75%, oklch(var(--shadow-ink) / 0.12) 0%, transparent 45%)",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
