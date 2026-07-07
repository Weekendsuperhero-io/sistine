"use client";

import * as React from "react";
import {
  formatOklch,
  glassSolidSurface,
  HARMONIC_OFFSETS,
  type HarmonicName,
  harmonicHue,
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
  /** Icon foreground hue for `--foreground-ui`: a number (0–360) pins a hue; a harmonic name
   * ("complement" | "triad-1" | "split-2" | … — a color-wheel relationship rotated off --harmony-h,
   * tracked live); null → icons follow the theme/text color. Always contrast-solved (APCA/ARC). */
  iconHue: number | HarmonicName | null;
  /** Heading/large-text hue for `--foreground-soft` — same semantics as iconHue (number pins, a harmonic
   * name rotates off the theme live, null → follow the chosen palette ramp). */
  softHue: number | HarmonicName | null;
  /** Fine/small-text hue for `--foreground-strong` — same semantics (null → follow the palette ramp). */
  strongHue: number | HarmonicName | null;
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

/** Normalize a stored hue choice: a harmonic relationship name, a pinned number, else null. */
const hueChoice = (v: unknown): number | HarmonicName | null =>
  typeof v === "string" && v in HARMONIC_OFFSETS ? (v as HarmonicName) : typeof v === "number" ? v : null;

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
      // Colorfulness gate — CHROMA is the single master now that Wash is retired: tint-c > 0 → colored
      // foregrounds (at the ramp's vividness) + hue-tracking harmonics; chroma 0 → achromatic. (tintA still
      // feeds the glass-solid SURFACE color below, but no longer decides "is this theme colored?".)
      const tintC = num("--glass-tint-c", 0);
      // Harmony anchor — the wheel origin the icon/foreground harmonics rotate from. Mirrors the CSS
      // --harmony-h (content hue, or 0 for the hue-less neutral/bone themes set inline by the tint switcher);
      // falls back to the content hue when unset (jewels), so JS harmonics land on the SAME angle as the
      // --hue-* swatches. harmonicHue(harmonyH, name) below matches calc(var(--harmony-h) + N) exactly.
      const harmonyH = num("--harmony-h", tintH);
      const cfgC = rc ?? storedRamp.c;
      // A neutral tint → ACHROMATIC foregrounds (black/white/gray by lightness). EXCEPTION: the Hue
      // palette stays a full-spectrum color wheel even when neutral — there's no base hue to rotate, so a
      // gray hue ramp is pointless; show all hues. An active tint uses the config's vividness.
      const base = {
        l: rl ?? storedRamp.l,
        c: palette === "hue" ? cfgC || 0.15 : tintC > 0 ? cfgC : 0,
        h: tintH,
      };
      // Draw every foreground from the chosen tonal/lightness ramp — real theme COLORS, not neutral
      // gray — each picked to hit its ARC-Bronze contrast target on the surface text actually sits on.
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
      const iconHue = storedFg.iconHue;
      // Set the full foreground tier set against a given SURFACE, under a var suffix. Run twice: "" for the
      // normal glass-SOLID surface (page + translucent/solid cards), and "-opaque" for the solid
      // --glass-opaque-bg floor. The opaque re-skin in globals.css remaps --foreground* → the -opaque vars
      // inside opaque cards, so a LIGHT opaque floor (e.g. dark-mode bone cream) gets DARK card text while
      // the dark page keeps light text — one global foreground can't do both, so opaque cards get their own.
      const applyTiers = (
        surface: {
          l: number;
          c: number;
          h: number;
        },
        suffix: string,
        adaptive: boolean,
      ) => {
        // Band-aware pick: honor each tier's floor (minimum) + ceiling (anti-spike), aiming for target. Normal
        // surfaces draw a COLORED pick from the theme ramp; `adaptive` (opaque floors) uses readableForeground
        // instead, which flips the lightness DIRECTION to whatever the floor needs — the ramp only spans the
        // readable half (white→base in dark mode), so it can't produce DARK text for a light floor (bone cream).
        const tier = (band: { floor: number; target: number; ceiling: number }) =>
          formatOklch(
            adaptive
              ? readableForeground(surface, {
                  floor: band.floor,
                  target: band.target,
                  ceiling: band.ceiling,
                  hue: tintH,
                  chroma: tintC > 0 ? cfgC : 0,
                })
              : pickInBand(ramp, surface, band),
          );
        root.style.setProperty(`--foreground${suffix}`, tier(READABLE_USAGE.body));
        root.style.setProperty(
          `--muted-foreground${suffix}`,
          tier({
            floor: 45,
            target: 60,
            ceiling: 75,
          }),
        );
        // Size tiers default to a palette-ramp pick (tier). softHue/strongHue (mirroring iconHue) optionally
        // pin a tier to its OWN readable hue — a number, "complement" (theme's opposite, live), or null =
        // follow the palette — so headings / fine text can be tinted independently of body text.
        const tierAtHue = (usage: "large" | "small", choice: number | HarmonicName | null) =>
          choice == null
            ? tier(READABLE_USAGE[usage])
            : formatOklch(
                readableForeground(surface, {
                  usage,
                  hue: typeof choice === "string" ? harmonicHue(harmonyH, choice) : choice,
                  chroma: 0.15,
                }),
              );
        root.style.setProperty(`--foreground-soft${suffix}`, tierAtHue("large", storedFg.softHue));
        root.style.setProperty(`--foreground-strong${suffix}`, tierAtHue("small", storedFg.strongHue));
        // Icons get their own foreground: a ui-band-legible color (lightness solved for contrast) at an
        // OPTIONAL chosen hue — so icons can be tinted/cycled while staying readable, independent of the
        // text palette. iconHue null → follow the theme (neutral → gray, tinted → the tint hue).
        const iconH = typeof iconHue === "string" ? harmonicHue(harmonyH, iconHue) : typeof iconHue === "number" ? iconHue : tintH;
        root.style.setProperty(
          `--foreground-ui${suffix}`,
          formatOklch(
            readableForeground(surface, {
              usage: "ui",
              hue: iconH,
              chroma: iconHue != null ? 0.15 : tintC > 0 ? cfgC : 0,
            }),
          ),
        );
      };

      // Normal surface: the glass-SOLID floor body text sits on (page + translucent/solid cards).
      applyTiers(
        glassSolidSurface(
          dark,
          {
            h: tintH,
            c: num("--glass-tint-c", 0),
            a: tintA,
          },
          num("--glass-solid-a", 0.65),
        ),
        "",
        false,
      );
      // Opaque cards paint the solid --glass-opaque-bg floor — band a second set against it (its lightness
      // is exposed as the numeric --glass-opaque-l token; chroma/hue from the tint). `adaptive` so a LIGHT
      // floor (bone cream) gets DARK text — the theme ramp only spans the readable half and can't.
      applyTiers(
        {
          l: num("--glass-opaque-l", dark ? 32 : 90),
          c: num("--glass-tint-c", 0) * 0.9,
          h: tintH,
        },
        "-opaque",
        true,
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
