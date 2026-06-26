"use client";

import * as React from "react";
import { FRESCO_HUES } from "@/lib/canvas-background-utils";
import { type RampGradientAxis, rampGradient } from "@/lib/oklch-utils";

/**
 * A ramp-driven gradient wallpaper. The gradient is one of our oklch ramps (hue / lightness / tonal
 * / chroma) laid left → right, centered on the live glass-tint color (so it recolors with the theme)
 * with the center as a slightly wider plateau. Pure CSS — crisp at any DPI.
 */
export function GradientBackground({ axis = "tonal", angle = 90 }: { axis?: RampGradientAxis; angle?: number }) {
  const [{ hue, dark, p3, preset }, setState] = React.useState<{
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
      const v = Number.parseFloat(getComputedStyle(root).getPropertyValue("--glass-tint-h"));
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
  const frescoHues = preset ? FRESCO_HUES[preset] : undefined;
  const gradient = frescoHues
    ? `linear-gradient(${angle}deg in oklch, ${frescoHues.map((h) => `oklch(${l}% 0.15 ${h})`).join(", ")})`
    : rampGradient(
        axis,
        {
          l,
          c: 0.15,
          h: hue,
        },
        5,
        {
          angle,
          gamut: p3 ? "p3" : "srgb",
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
            "radial-gradient(circle at 20% 25%, oklch(100% 0 0 / 0.12) 0%, transparent 45%), radial-gradient(circle at 80% 75%, oklch(0% 0 0 / 0.12) 0%, transparent 45%)",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
