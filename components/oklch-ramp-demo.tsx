"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { chromaRamp, clampToGamut, formatOklch, hueRamp, lightnessRamp, lightnessRampColors } from "@/lib/oklch-utils";
import { cn } from "@/lib/utils";

// Theme-color quick-picks — clicking one seeds the base; the L/C/H sliders are the "custom" control.
const PRESETS = [
  {
    label: "Sapphire",
    l: 60,
    c: 0.15,
    h: 255,
  },
  {
    label: "Emerald",
    l: 62,
    c: 0.15,
    h: 158,
  },
  {
    label: "Amethyst",
    l: 60,
    c: 0.15,
    h: 300,
  },
  {
    label: "Rose",
    l: 64,
    c: 0.14,
    h: 8,
  },
  {
    label: "Amber",
    l: 74,
    c: 0.13,
    h: 75,
  },
  {
    label: "Sistine",
    l: 70,
    c: 0.1,
    h: 78,
  },
  {
    label: "Neutral",
    l: 66,
    c: 0.02,
    h: 250,
  },
];

/**
 * Visual demo for lib/oklch-utils. Pick a theme color (or tune L/C/H), choose a step count, and
 * compare four ramps built from the SAME base — hue, chroma, lightness, and a gamut-safe tonal
 * (tints & shades). All four are centered, so the middle swatch is the base in each. Click to copy.
 * Reachable at /colors.
 */
export function OklchRampDemo() {
  const [l, setL] = React.useState(60);
  const [c, setC] = React.useState(0.15);
  const [h, setH] = React.useState(255);
  const [count, setCount] = React.useState(4);
  const [wideGamut, setWideGamut] = React.useState(false);

  const base = {
    l,
    c,
    h,
  };
  const baseCss = formatOklch(base);
  const gamut = wideGamut ? "p3" : "srgb";
  // Each ramp covers the FULL range of its axis (the utility derives the steps from `count`),
  // with the seed centered at index `count`.
  const hues = hueRamp(base, count);
  const chromas = chromaRamp(base, count);
  const lights = lightnessRamp(base, count);
  const tonal = lightnessRampColors(base, count).map((color) => formatOklch(clampToGamut(color, gamut)));

  return (
    <Card variant="glass" className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>OKLCH ramps</CardTitle>
        <CardDescription>
          Pick a theme color (or tune L/C/H), then compare its hue, chroma, lightness and tonal ramps — all built from the same base via{" "}
          <code className="text-xs">lib/oklch-utils</code>. The base is centered in each; click a swatch to copy it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => {
            const active = p.l === l && p.c === c && p.h === h;
            return (
              <button
                type="button"
                key={p.label}
                onClick={() => {
                  setL(p.l);
                  setC(p.c);
                  setH(p.h);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs transition-colors",
                  active ? "border-foreground" : "border-[var(--glass-border)] hover:bg-foreground/5",
                )}
              >
                <span
                  className="size-4 rounded-full border border-[var(--glass-border)]"
                  style={{
                    background: formatOklch(p),
                  }}
                />
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span
            className="size-12 shrink-0 rounded-lg border border-[var(--glass-border)]"
            style={{
              background: baseCss,
            }}
          />
          <div className="min-w-0">
            <div className="text-sm font-medium">Base</div>
            <code className="text-xs text-muted-foreground">{baseCss}</code>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Control label="Lightness" value={`${l}%`}>
            <Slider
              value={[
                l,
              ]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setL(v[0] ?? l)}
            />
          </Control>
          <Control label="Chroma" value={c.toFixed(3)}>
            <Slider
              value={[
                c,
              ]}
              min={0}
              max={0.37}
              step={0.005}
              onValueChange={(v) => setC(v[0] ?? c)}
            />
          </Control>
          <Control label="Hue" value={`${h}°`}>
            <Slider
              value={[
                h,
              ]}
              min={0}
              max={360}
              step={1}
              onValueChange={(v) => setH(v[0] ?? h)}
            />
          </Control>
          <Control label="Steps each side" value={String(count)}>
            <Slider
              value={[
                count,
              ]}
              min={3}
              max={8}
              step={1}
              onValueChange={(v) => setCount(v[0] ?? count)}
            />
          </Control>
        </div>

        <Ramp title="Hue ramp" colors={hues} mid={count} />
        <Ramp title="Chroma ramp" colors={chromas} mid={count} />
        <Ramp title="Lightness ramp" colors={lights} mid={count} />

        <div className="space-y-2">
          <Ramp title={`Tonal ramp · gamut-safe tints & shades (${wideGamut ? "P3" : "sRGB"})`} colors={tonal} mid={count} />
          <label className="flex w-fit items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={wideGamut} onCheckedChange={setWideGamut} />
            Wide gamut (P3)
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function Control({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Ramp({ title, colors, mid }: { title: string; colors: string[]; mid: number }) {
  const [copied, setCopied] = React.useState<number | null>(null);

  const copy = (css: string, i: number) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(css).then(
      () => setCopied(i),
      () => {},
    );
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="flex gap-1.5 py-1">
        {colors.map((css, i) => (
          <button
            type="button"
            key={`${css}-${i}`}
            onClick={() => copy(css, i)}
            title={`${css} — click to copy`}
            className={cn(
              "relative h-16 min-w-0 flex-1 rounded-md border border-[var(--glass-border)] transition-transform hover:scale-105",
              i === mid && "ring-2 ring-foreground/50 ring-offset-2 ring-offset-transparent",
            )}
            style={{
              background: css,
            }}
          >
            <span className="sr-only">{css}</span>
            {copied === i && (
              <span className="absolute inset-x-0 bottom-1 text-center text-[10px] font-medium text-foreground mix-blend-difference">copied</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
