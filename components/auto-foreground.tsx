"use client";

import * as React from "react";
import { formatOklch, type ThemeForegroundOptions, themeForeground } from "@/lib/oklch-utils";

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
  count: 8,
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

/**
 * Sets `--foreground` + `--muted-foreground` on <html> by walking the ramp generator's ramp (chosen
 * palette + base color + step count, persisted from /colors). `start` picks which level is
 * `--foreground`; the next level down is `--muted-foreground`. Recomputed on theme / config change
 * only. globals.css carries the level-0/level-1 defaults as a static fallback, so there's no flash.
 */
export function AutoForeground() {
  React.useEffect(() => {
    const root = document.documentElement;

    const update = () => {
      const dark = root.classList.contains("dark");
      const { palette, start } = readFgConfig();
      const { l, c, h, count } = readRampConfig();
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
    };

    update();
    // Theme class drives the light/dark extreme; palette/base/count/start changes come through FG_EVENT.
    const observer = new MutationObserver(update);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "class",
      ],
    });
    window.addEventListener(FG_EVENT, update);
    return () => {
      observer.disconnect();
      window.removeEventListener(FG_EVENT, update);
    };
  }, []);

  return null;
}
