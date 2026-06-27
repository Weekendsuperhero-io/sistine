"use client";

import * as React from "react";
import { formatOklch, glassSurface, readableForeground, type ThemeForegroundOptions, themeForeground } from "@/lib/oklch-utils";

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
 * Sets `--foreground` + `--muted-foreground` on <html> by walking an OKLCH ramp (palette + base color +
 * step count) so text contrast tracks light/dark automatically. `start` picks which level is
 * `--foreground`; the next level down is `--muted-foreground`. globals.css carries the level-0/level-1
 * defaults as a static fallback, so there's no flash.
 *
 * Configure declaratively — `<AutoForeground palette="tonal" start={0} ramp={{ l, c, h, count }} />` — or,
 * with no props, it reads a persisted config (`writeFgConfig` / `writeRampConfig`, e.g. a live generator)
 * and re-applies on the `sistine-fg` event. It intentionally mutates the global `--foreground` /
 * `--muted-foreground`, so mount it once at the app root. It also sets the ARC-Bronze size tiers
 * `--foreground-soft` (large/heading) and `--foreground-strong` (fine), banded via readableForeground
 * against the live glass surface — exposed as the `text-foreground-soft` / `text-foreground-strong` utilities.
 */
export function AutoForeground({ palette: paletteProp, start: startProp, ramp: rampProp }: AutoForegroundProps = {}) {
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
      const start = startProp ?? storedFg.start;
      const l = rl ?? storedRamp.l;
      const c = rc ?? storedRamp.c;
      const h = rh ?? storedRamp.h;
      const count = rcount ?? storedRamp.count;
      const base = {
        l,
        c,
        h,
      };
      const s = Math.max(0, Math.min(start, count)); // --foreground level; the rest ramp down to base
      const at = (level: number) =>
        formatOklch(
          themeForeground({
            palette,
            level,
            count,
            base,
            dark,
          }),
        );
      root.style.setProperty("--foreground", at(s));
      root.style.setProperty("--auto-fg", at(s));
      root.style.setProperty("--muted-foreground", at(Math.min(s + 1, count)));

      // Size-tiered foregrounds (ARC Bronze Simple Mode bands), judged against the glass surface text
      // sits on — headings ease off the pure-extreme spike (large band) while fine print stays crisp.
      const cs = getComputedStyle(root);
      const tintH = Number.parseFloat(cs.getPropertyValue("--glass-tint-h"));
      const tintC = Number.parseFloat(cs.getPropertyValue("--glass-tint-c"));
      const tintA = Number.parseFloat(cs.getPropertyValue("--glass-tint-a"));
      const surface = glassSurface(dark, {
        h: Number.isNaN(tintH) ? 255 : tintH,
        c: Number.isNaN(tintC) ? 0 : tintC,
        a: Number.isNaN(tintA) ? 0 : tintA,
      });
      root.style.setProperty(
        "--foreground-soft",
        formatOklch(
          readableForeground(surface, {
            usage: "large",
          }),
        ),
      );
      root.style.setProperty(
        "--foreground-strong",
        formatOklch(
          readableForeground(surface, {
            usage: "small",
          }),
        ),
      );
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
    startProp,
    rl,
    rc,
    rh,
    rcount,
  ]);

  return null;
}
