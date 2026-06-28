"use client";

import * as React from "react";
import {
  complement,
  formatOklch,
  glassSolidSurface,
  pickInBand,
  READABLE_USAGE,
  readableForeground,
  type ThemeForegroundOptions,
  themeForeground,
} from "@/lib/oklch-utils";

const FG_STORAGE_KEY = "sistine-fg";
const RAMP_KEY = "sistine-ramp";
const FG_EVENT = "sistine-fg";

export type FgPalette = ThemeForegroundOptions["palette"];
export interface FgConfig {
  palette: FgPalette;
  /** Icon foreground hue for `--foreground-ui`: a number (0–360) pins a hue, "complement" tracks the
   * theme's opposite hue live, null → icons follow the theme/text color. */
  iconHue: number | "complement" | null;
  /** Heading/large-text hue for `--foreground-soft` — same semantics as iconHue (number pins, "complement"
   * tracks the opposite live, null → follow the chosen palette ramp). */
  softHue: number | "complement" | null;
  /** Fine/small-text hue for `--foreground-strong` — same semantics (null → follow the palette ramp). */
  strongHue: number | "complement" | null;
}
/** The /colors ramp generator's base color + step count, shared with the foreground. */
export interface RampConfig {
  l: number;
  c: number;
  h: number;
  count: number;
}

const FG_PALETTES: FgPalette[] = [
  "tonal",
  "lightness",
  "hue",
  "chroma",
];
const DEFAULT_FG: FgConfig = {
  palette: "lightness", // linear ramp — holds the theme's chroma, so high-contrast text reads as a soft tinted white, not gray
  iconHue: null,
  softHue: null,
  strongHue: null,
};
const DEFAULT_RAMP: RampConfig = {
  l: 60,
  c: 0.15,
  h: 255,
  count: 12, // finest ramp (12 steps/side) — the most cohesive foreground set in practice
};

/** Normalize a stored hue choice: a number pins it, "complement" tracks the theme's opposite, else null. */
const hueChoice = (v: unknown): number | "complement" | null => (v === "complement" ? "complement" : typeof v === "number" ? v : null);

/** Read the persisted foreground palette; falls back to the default (Linear). */
export function readFgConfig(): FgConfig {
  try {
    const raw = localStorage.getItem(FG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FgConfig>;
      if (FG_PALETTES.includes(parsed.palette as FgPalette)) {
        return {
          palette: parsed.palette as FgPalette,
          iconHue: hueChoice(parsed.iconHue),
          softHue: hueChoice(parsed.softHue),
          strongHue: hueChoice(parsed.strongHue),
        };
      }
    }
  } catch {
    // ignore parse / storage failures
  }
  return DEFAULT_FG;
}

/** Persist the foreground config + notify AutoForeground to re-apply it site-wide. */
export function writeFgConfig(config: Partial<FgConfig>): void {
  try {
    localStorage.setItem(
      FG_STORAGE_KEY,
      JSON.stringify({
        ...readFgConfig(),
        ...config,
      }),
    );
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new Event(FG_EVENT));
}

/** Read the ramp generator's base color + count (shared from the /colors ramp card). */
export function readRampConfig(): RampConfig {
  try {
    const raw = localStorage.getItem(RAMP_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<RampConfig>;
      if (
        [
          p.l,
          p.c,
          p.h,
          p.count,
        ].every((n) => typeof n === "number")
      ) {
        return {
          l: p.l as number,
          c: p.c as number,
          h: p.h as number,
          count: p.count as number,
        };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_RAMP;
}

/** Persist the ramp base color + count + notify AutoForeground (called by the ramp generator). */
export function writeRampConfig(config: RampConfig): void {
  try {
    localStorage.setItem(RAMP_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(FG_EVENT));
}

export interface AutoForegroundProps {
  /** Foreground ramp palette. Overrides the persisted config when set. */
  palette?: FgPalette;
  /** Ramp base color + step count. Overrides the persisted ramp when set. */
  ramp?: RampConfig;
}

/**
 * Sets the foreground tokens on <html> by drawing COLORS from the chosen OKLCH ramp (palette + base
 * color + step count): `--foreground`, `--muted-foreground`, and the ARC-Bronze size tiers
 * `--foreground-soft` (large) / `--foreground-strong` (fine), plus the icon foreground `--foreground-ui`
 * (ui band, optional hue). Each is picked from that ramp to hit its contrast target on the glass-SOLID
 * surface text sits on — so foregrounds are real theme colors, not neutral gray, and track light/dark +
 * tint automatically. globals.css carries static fallbacks (no flash); the tiers are exposed as the
 * `text-foreground-soft` / `-strong` / `-ui` utilities.
 *
 * Configure declaratively — `<AutoForeground palette="tonal" ramp={{ l, c, h, count }} />` — or, with no
 * props, it reads a persisted config (`writeRampConfig`, e.g. the /colors generator) and re-applies on the
 * `sistine-fg` event. Mount it once at the app root. The foreground level is contrast-target-driven
 * (the ARC-Bronze band per tier), not a manual ramp index.
 */
export function AutoForeground({ palette: paletteProp, ramp: rampProp }: AutoForegroundProps = {}) {
  const rl = rampProp?.l;
  const rc = rampProp?.c;
  const rh = rampProp?.h;
  const rcount = rampProp?.count;

  React.useEffect(() => {
    const root = document.documentElement;

    const update = () => {
      const dark = root.classList.contains("dark");
      const storedFg = readFgConfig();
      const storedRamp = readRampConfig();
      const palette = paletteProp ?? storedFg.palette;
      const count = rcount ?? storedRamp.count;
      const cs = getComputedStyle(root);
      const num = (name: string, fb: number) => {
        const v = Number.parseFloat(cs.getPropertyValue(name));
        return Number.isNaN(v) ? fb : v;
      };
      // Foregrounds FOLLOW THE CHOSEN FOREGROUND HUE: the ramp's hue is --glass-fg-h (which defaults to
      // the glass tint --glass-tint-h, but frescoes set it apart so text anchors off their surface).
      // Lightness + chroma (vividness) and step count come from the /colors ramp config. Picks are
      // measured on the glass-SOLID surface body text sits on — a known surface, so a real Lc.
      const tintH = num("--glass-fg-h", num("--glass-tint-h", rh ?? storedRamp.h));
      const tintA = num("--glass-tint-a", 0);
      const cfgC = rc ?? storedRamp.c;
      // A neutral tint → ACHROMATIC foregrounds (black/white/gray by lightness). EXCEPTION: the Hue
      // palette stays a full-spectrum color wheel even when neutral — there's no base hue to rotate, so a
      // gray hue ramp is pointless; show all hues. An active tint uses the config's vividness.
      const base = {
        l: rl ?? storedRamp.l,
        c: palette === "hue" ? cfgC || 0.15 : tintA > 0 ? cfgC : 0,
        h: tintH,
      };
      const surface = glassSolidSurface(
        dark,
        {
          h: tintH,
          c: num("--glass-tint-c", 0),
          a: tintA,
        },
        num("--glass-solid-a", 0.65),
      );

      // Draw every foreground from the chosen tonal/lightness ramp — real theme COLORS, not neutral
      // gray — each picked to hit its ARC-Bronze contrast target on that surface.
      const ramp = Array.from(
        {
          length: count + 1,
        },
        (_, level) =>
          themeForeground({
            palette,
            level,
            count,
            base,
            dark,
          }),
      );
      // Band-aware pick: honor each tier's floor (minimum) and ceiling (anti-spike), aiming for target.
      const tier = (band: { floor: number; target: number; ceiling: number }) => formatOklch(pickInBand(ramp, surface, band));
      const fg = tier(READABLE_USAGE.body);
      root.style.setProperty("--foreground", fg);
      root.style.setProperty(
        "--muted-foreground",
        tier({
          floor: 45,
          target: 60,
          ceiling: 75,
        }),
      );
      // Size tiers default to a palette-ramp pick (tier). softHue/strongHue (mirroring iconHue) optionally
      // pin a tier to its OWN readable hue — a number, "complement" (theme's opposite, live), or null =
      // follow the palette — so headings / fine text can be tinted independently of body text.
      const tierAtHue = (usage: "large" | "small", choice: number | "complement" | null) =>
        choice == null
          ? tier(READABLE_USAGE[usage])
          : formatOklch(
              readableForeground(surface, {
                usage,
                hue: choice === "complement" ? complement(base).h : choice,
                chroma: 0.15,
              }),
            );
      root.style.setProperty("--foreground-soft", tierAtHue("large", storedFg.softHue));
      root.style.setProperty("--foreground-strong", tierAtHue("small", storedFg.strongHue));

      // Icons get their own foreground: a ui-band-legible color (lightness solved for contrast) at an
      // OPTIONAL chosen hue — so icons can be tinted/cycled while staying readable, independent of the
      // text palette. iconHue null → follow the theme (neutral → gray, tinted → the tint hue).
      const iconHue = storedFg.iconHue;
      // "complement" tracks the theme's opposite hue live; a number pins one; null → follow the theme.
      const iconH = iconHue === "complement" ? complement(base).h : typeof iconHue === "number" ? iconHue : tintH;
      root.style.setProperty(
        "--foreground-ui",
        formatOklch(
          readableForeground(surface, {
            usage: "ui",
            hue: iconH,
            chroma: iconHue != null ? 0.15 : tintA > 0 ? cfgC : 0,
          }),
        ),
      );
    };

    update();
    // Theme class drives the light/dark extreme; palette/base/count changes come through FG_EVENT.
    const observer = new MutationObserver(update);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "class",
        "data-glass-tint",
      ],
    });
    window.addEventListener(FG_EVENT, update);
    return () => {
      observer.disconnect();
      window.removeEventListener(FG_EVENT, update);
    };
  }, [
    paletteProp,
    rl,
    rc,
    rh,
    rcount,
  ]);

  return null;
}
