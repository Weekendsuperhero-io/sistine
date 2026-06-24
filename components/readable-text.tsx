"use client";

import * as React from "react";
import { apcaContrast, formatOklch, type OklchColor, parseOklch, pickForeground } from "@/lib/oklch-utils";

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
      const tintH = Number.parseFloat(cs.getPropertyValue("--glass-tint-h"));
      const tintC = Number.parseFloat(cs.getPropertyValue("--glass-tint-c"));
      // The glass surface the text sits on: a light (or dark) base at the current tint hue + wash chroma.
      const surface: OklchColor = {
        l: root.classList.contains("dark") ? 20 : 94,
        c: Number.isNaN(tintC) ? 0 : Math.min(0.12, tintC * 4),
        h: Number.isNaN(tintH) ? intended.h : tintH,
      };
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
