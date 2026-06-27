"use client";

import * as React from "react";
import { formatOklch, glassSolidSurface, pickByContrast, READABLE_USAGE, type ThemeForegroundOptions, themeForeground } from "@/lib/oklch-utils";

const FG_STORAGE_KEY = "sistine-fg";
const RAMP_KEY = "sistine-ramp";
const FG_EVENT = "sistine-fg";

export type FgPalette = ThemeForegroundOptions["palette"];
export interface FgConfig {
  palette: FgPalette;
  /** Which ramp level is `--foreground`; the next level down is `--muted-foreground`. */
  start: number;
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
  palette: "tonal",
  start: 0,
};
const DEFAULT_RAMP: RampConfig = {
  l: 60,
  c: 0.15,
  h: 255,
  count: 12, // finest ramp (12 steps/side) — the most cohesive foreground set in practice
};

/** Read the persisted foreground palette + start level; falls back to tonal / 0. */
export function readFgConfig(): FgConfig {
  try {
    const raw = localStorage.getItem(FG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FgConfig>;
      if (FG_PALETTES.includes(parsed.palette as FgPalette)) {
        return {
          palette: parsed.palette as FgPalette,
          start: typeof parsed.start === "number" ? parsed.start : 0,
        };
      }
    }
  } catch {
    // ignore parse / storage failures
  }
  return DEFAULT_FG;
}

/** Persist the foreground config + notify AutoForeground to re-apply it site-wide. */
export function writeFgConfig(config: FgConfig): void {
  try {
    localStorage.setItem(FG_STORAGE_KEY, JSON.stringify(config));
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
  /** Which ramp level is `--foreground` (the next level down is `--muted-foreground`). Overrides persisted. */
  start?: number;
  /** Ramp base color + step count. Overrides the persisted ramp when set. */
  ramp?: RampConfig;
}

/**
 * Sets the foreground tokens on <html> by drawing COLORS from the chosen OKLCH ramp (palette + base
 * color + step count): `--foreground`, `--muted-foreground`, and the ARC-Bronze size tiers
 * `--foreground-soft` (large) / `--foreground-strong` (fine). Each is picked from that tonal/lightness
 * ramp to hit its contrast target on the glass-SOLID surface text sits on — so foregrounds are real
 * theme colors, not neutral gray, and track light/dark + tint automatically. globals.css carries static
 * fallbacks (no flash); the tiers are exposed as the `text-foreground-soft` / `text-foreground-strong` utilities.
 *
 * Configure declaratively — `<AutoForeground palette="tonal" ramp={{ l, c, h, count }} />` — or, with no
 * props, it reads a persisted config (`writeRampConfig`, e.g. the /colors generator) and re-applies on the
 * `sistine-fg` event. Mount it once at the app root. (`start` is accepted for back-compat but the
 * foreground level is now contrast-target-driven, not a manual ramp index.)
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
      const l = rl ?? storedRamp.l;
      const c = rc ?? storedRamp.c;
      const h = rh ?? storedRamp.h;
      const count = rcount ?? storedRamp.count;
      const base = {
        l,
        c,
        h,
      };

      // The glass-SOLID surface body text sits on (live tint + --glass-solid-a) — a known surface, so
      // the contrast picks below are real, not a sheer-glass estimate.
      const cs = getComputedStyle(root);
      const num = (name: string, fb: number) => {
        const v = Number.parseFloat(cs.getPropertyValue(name));
        return Number.isNaN(v) ? fb : v;
      };
      const surface = glassSolidSurface(
        dark,
        {
          h: num("--glass-tint-h", h),
          c: num("--glass-tint-c", 0),
          a: num("--glass-tint-a", 0),
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
      const tier = (target: number) => formatOklch(pickByContrast(ramp, surface, target));
      const fg = tier(READABLE_USAGE.body.target);
      root.style.setProperty("--foreground", fg);
      root.style.setProperty("--auto-fg", fg);
      root.style.setProperty("--muted-foreground", tier(60));
      root.style.setProperty("--foreground-soft", tier(READABLE_USAGE.large.target));
      root.style.setProperty("--foreground-strong", tier(READABLE_USAGE.small.target));
    };

    update();
    // Theme class drives the light/dark extreme; palette/base/count/start changes come through FG_EVENT.
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
