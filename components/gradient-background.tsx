"use client";

import { backdropPalette, useBackdropTint } from "@/lib/canvas-background-utils";
import {
  formatOklch,
  type GradientGeometry,
  type GradientShape,
  parseOklch,
  type RampGradientAxis,
  rampGradient,
  readableLightnessBand,
  wrapGradient,
} from "@/lib/oklch-utils";

/* Frescoes are authored as fixed multi-hue stops at one lightness, so they skip the ramp entirely —
   which also means they skip its banding and its conic loop-close. Apply both here. */
function bandedFrescoStops(
  colors: string[],
  band:
    | {
        lMin: number;
        lMax: number;
      }
    | undefined,
  shape: GradientShape,
): string {
  let out = colors;
  if (band) {
    out = out.map((css) => {
      const parsed = parseOklch(css);
      if (!parsed) return css;
      return formatOklch({
        ...parsed,
        l: Math.min(band.lMax, Math.max(band.lMin, parsed.l)),
      });
    });
  }
  if (shape === "conic" && out.length > 1) {
    const loop = [
      ...out,
      out[0],
    ];
    return loop.map((css, i) => `${css} ${((i / (loop.length - 1)) * 100).toFixed(1)}%`).join(", ");
  }
  return out.join(", ");
}

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
  const tint = useBackdropTint();
  // Shared with CanvasBackground: theme-tracking base + fresco palette (the `hue` prop overrides both).
  const { base, frescoColors } = backdropPalette(tint, hue);
  /* The ramps span their FULL range by design — as a wallpaper that put pure black at one edge of the
     viewport and pure white at the other, so a single solved foreground could only be readable at one
     end. Fit the ramp into the band where text over it clears APCA 60 instead. Falls back to the whole
     range if the foreground has not resolved yet (first paint, before AutoForeground runs). */
  const band = tint.fg ? readableLightnessBand(tint.fg, base) : undefined;
  const gradient = frescoColors
    ? wrapGradient(shape, bandedFrescoStops(frescoColors, band, shape), {
        angle,
        position,
        radialShape,
        radialSize,
      })
    : rampGradient(axis, base, 5, {
        angle,
        band,
        gamut: tint.p3 ? "p3" : "srgb",
        shape,
        position,
        radialShape,
        radialSize,
      });

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none transition-[background] duration-500"
      style={{
        background: gradient,
      }}
    >
      {/* Subtle organic highlight/shadow for depth — plain alpha layers, NO mix-blend-mode: a
          blend-mode element on the page can disable backdrop-filter RENDERING in Chromium, killing
          every glass blur above it (computed styles stay correct, paint silently fails). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 25%, oklch(var(--shadow-highlight) / 0.1) 0%, transparent 45%), radial-gradient(circle at 80% 75%, oklch(var(--shadow-ink) / 0.1) 0%, transparent 45%)",
        }}
      />
    </div>
  );
}
