"use client";

import * as React from "react";
import {
  apcaContrast,
  formatOklch,
  glassSurface,
  type OklchColor,
  parseOklch,
  READABLE_USAGE,
  type ReadableUsage,
  readableForeground,
} from "@/lib/oklch-utils";

/**
 * Readable foreground for a KNOWN surface color — pure and memoized (no DOM read, no observer), so it
 * scales to hundreds of off-theme surfaces (e.g. colored tool-call bubbles) at negligible cost.
 * Returns an oklch() string banded for `usage` (ARC Bronze; default "body"). For theme-surface text,
 * prefer the CSS tokens (text-foreground / -soft / -strong) or <ReadableText>.
 *
 *   const fg = useReadableForeground({ l: 70, c: 0.18, h: 50 }, "ui"); // readable icon on orange
 */
export function useReadableForeground(surface: string | OklchColor, usage: ReadableUsage = "body"): string {
  const css = typeof surface === "string" ? surface : formatOklch(surface);
  return React.useMemo(() => {
    const s = parseOklch(css);
    return s
      ? formatOklch(
          readableForeground(s, {
            usage,
          }),
        )
      : "inherit";
  }, [
    css,
    usage,
  ]);
}

const cssNum = (cs: CSSStyleDeclaration, name: string, fallback: number): number => {
  const v = Number.parseFloat(cs.getPropertyValue(name));
  return Number.isNaN(v) ? fallback : v;
};

/**
 * Dynamic APCA contrast guard. Renders its text in `accent` (a CSS custom-property name such as
 * "--primary") *while that color stays readable* on the surface, otherwise a soft readable foreground
 * via readableForeground — legible without the pure-black/white spike. The surface is the live glass
 * (reactive to tint + light/dark) by default; pass `on` (an oklch string) to band against an arbitrary
 * surface, e.g. an off-theme bubble. `usage` selects the ARC-Bronze band. Reuses lib/oklch-utils.
 */
export function ReadableText({
  accent,
  on,
  usage,
  minLc,
  className,
  children,
}: {
  /** CSS custom-property name to use when readable, e.g. "--primary". */
  accent: string;
  /** Surface to judge against — an oklch() string. Defaults to the live glass surface. */
  on?: string;
  /** ARC-Bronze band ("body" | "large" | "ui" | …) — sets the keep-accent floor + the soft fallback. */
  usage?: ReadableUsage;
  /** Minimum |APCA Lc| to keep the accent. Defaults to the usage floor, else 45. */
  minLc?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [color, setColor] = React.useState<string>();

  React.useEffect(() => {
    const root = document.documentElement;
    const floor = minLc ?? (usage ? READABLE_USAGE[usage].floor : 45);
    const pick = () => {
      const cs = getComputedStyle(root);
      const intended = parseOklch(cs.getPropertyValue(accent).trim());
      if (!intended) return;
      const dark = root.classList.contains("dark");
      // `on` (a fixed surface color) bands against an off-theme surface; otherwise the live glass.
      const surface = on
        ? parseOklch(on)
        : glassSurface(dark, {
            h: cssNum(cs, "--glass-tint-h", intended.h),
            c: cssNum(cs, "--glass-tint-c", 0),
            a: cssNum(cs, "--glass-tint-a", 0),
          });
      if (!surface) return;
      const readable = Math.abs(apcaContrast(intended, surface)) >= floor;
      setColor(
        formatOklch(
          readable
            ? intended
            : readableForeground(surface, {
                usage: usage ?? "body",
              }),
        ),
      );
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
    on,
    usage,
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
