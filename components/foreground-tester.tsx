"use client";

import * as React from "react";
import { type FgPalette, readFgConfig, readRampConfig, writeFgConfig } from "@/components/auto-foreground";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apcaContrast, formatOklch, glassSurface, themeForeground } from "@/lib/oklch-utils";
import { cn } from "@/lib/utils";

const PALETTES: {
  key: FgPalette;
  label: string;
}[] = [
  {
    key: "tonal",
    label: "Tonal",
  },
  {
    key: "lightness",
    label: "Lightness",
  },
  {
    key: "hue",
    label: "Hue",
  },
  {
    key: "chroma",
    label: "Chroma",
  },
];

/**
 * Live tester for the site-wide foreground cascade: pick the ramp axis, then click a swatch to set
 * the starting color (`--foreground`); the next swatch down becomes `--muted-foreground` and the
 * ramp continues toward the base. Base color + step count are shared from the ramp generator above.
 */
export function ForegroundTester() {
  const [palette, setPalette] = React.useState<FgPalette>("tonal");
  const [start, setStart] = React.useState(0);
  const [{ l, c, h, count, dark }, setEnv] = React.useState({
    l: 60,
    c: 0.15,
    h: 255,
    count: 4,
    dark: true,
  });

  React.useEffect(() => {
    const cfg = readFgConfig();
    setPalette(cfg.palette);
    setStart(cfg.start);
    const root = document.documentElement;
    const readEnv = () => {
      const r = readRampConfig();
      setEnv({
        l: r.l,
        c: r.c,
        h: r.h,
        count: r.count,
        dark: root.classList.contains("dark"),
      });
    };
    readEnv();
    const observer = new MutationObserver(readEnv);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "class",
      ],
    });
    window.addEventListener("sistine-fg", readEnv);
    return () => {
      observer.disconnect();
      window.removeEventListener("sistine-fg", readEnv);
    };
  }, []);

  const applyPalette = (p: FgPalette) => {
    setPalette(p);
    writeFgConfig({
      palette: p,
      start,
    });
  };
  const applyStart = (level: number) => {
    setStart(level);
    writeFgConfig({
      palette,
      start: level,
    });
  };

  const base = {
    l,
    c,
    h,
  };
  const startLevel = Math.min(start, count);
  const surface = glassSurface(dark, {
    h,
    c: 0,
    a: 0,
  });
  const levels = Array.from(
    {
      length: count + 1,
    },
    (_, level) => {
      const color = themeForeground({
        palette,
        level,
        count,
        base,
        dark,
      });
      return {
        level,
        css: formatOklch(color),
        lc: Math.round(Math.abs(apcaContrast(color, surface))),
      };
    },
  );

  return (
    <Card variant="glass" className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>
          Foreground source <span className="font-normal text-muted-foreground text-sm">· experimental</span>
        </CardTitle>
        <CardDescription>
          Site text walks a ramp built from the base color above ({formatOklch(base)}), {count} steps. Pick the axis, then{" "}
          <strong>click a swatch to set the starting color</strong> (<code className="text-xs">--foreground</code>) — the next swatch down becomes{" "}
          <code className="text-xs">--muted-foreground</code> and the ramp continues toward the base.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="inline-flex flex-wrap gap-1">
          {PALETTES.map((p) => (
            <button
              type="button"
              key={p.key}
              onClick={() => applyPalette(p.key)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium text-xs transition-colors",
                palette === p.key ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {levels.map(({ level, css, lc }) => {
            const role = level === startLevel ? "Text" : level === startLevel + 1 ? "Muted" : `${level}`;
            return (
              <button
                type="button"
                key={level}
                title={`${css} — click to start here`}
                onClick={() => applyStart(level)}
                className={cn(
                  "flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-lg border p-3 transition-transform active:scale-[0.97]",
                  level === startLevel ? "border-foreground ring-2 ring-foreground/40" : "border-[var(--glass-border)] hover:border-foreground/40",
                )}
              >
                <span
                  className="font-semibold text-xl leading-none"
                  style={{
                    color: css,
                  }}
                >
                  Aa
                </span>
                <span
                  className={cn(
                    "text-[10px]",
                    level <= startLevel + 1 && level >= startLevel ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {role}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">Lc {lc}</span>
              </button>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          The highlighted swatch is <strong>--foreground</strong>; the one after it is <strong>--muted-foreground</strong>. Change the base color or
          step count in the ramp generator above to retune; hover a swatch for its oklch.
        </p>
      </CardContent>
    </Card>
  );
}
