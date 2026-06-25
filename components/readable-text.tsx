"use client";

import * as React from "react";
import { apcaContrast, formatOklch, glassSurface, parseOklch, pickForeground } from "@/lib/oklch-utils";

/**
 * Dynamic APCA contrast guard. Renders its text in `accent` (a CSS custom-property name such as
 * "--primary") *when that color stays readable* on the current glass surface, and otherwise swaps to
 * a readable foreground via pickForeground. Reactive to the live tint (--glass-tint-h / -c) and
 * light/dark, so it re-decides whenever the theme changes — the dynamic alternative to hard-coding a
 * single text color. Reuses lib/oklch-utils (apcaContrast + pickForeground).
 */
export function ReadableText({
  accent,
  minLc = 45,
  className,
  children,
}: {
  /** CSS custom-property name to use when readable, e.g. "--primary". */
  accent: string;
  /** Minimum |APCA Lc| to keep the accent (≈45 suits small/semibold badge text). */
  minLc?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [color, setColor] = React.useState<string>();

  React.useEffect(() => {
    const root = document.documentElement;
    const pick = () => {
      const cs = getComputedStyle(root);
      const intended = parseOklch(cs.getPropertyValue(accent).trim());
      if (!intended) return;
      const dark = root.classList.contains("dark");
      const tintH = Number.parseFloat(cs.getPropertyValue("--glass-tint-h"));
      const tintC = Number.parseFloat(cs.getPropertyValue("--glass-tint-c"));
      const tintA = Number.parseFloat(cs.getPropertyValue("--glass-tint-a"));
      // The glass surface the text sits on, via the canonical wash derivation shared with the
      // glass-* utilities (glassSurface mirrors --glass-tint-wash), so the guard judges against the
      // same surface the CSS paints — including how tint alpha shifts its lightness and chroma.
      const surface = glassSurface(dark, {
        h: Number.isNaN(tintH) ? intended.h : tintH,
        c: Number.isNaN(tintC) ? 0 : tintC,
        a: Number.isNaN(tintA) ? 0 : tintA,
      });
      const readable = Math.abs(apcaContrast(intended, surface)) >= minLc;
      setColor(formatOklch(readable ? intended : pickForeground(surface)));
    };
    pick();
    const observer = new MutationObserver(pick);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "style",
        "class",
        "data-glass-tint",
      ],
    });
    return () => observer.disconnect();
  }, [
    accent,
    minLc,
  ]);

  return (
    <span
      className={className}
      style={
        color
          ? {
              color,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
