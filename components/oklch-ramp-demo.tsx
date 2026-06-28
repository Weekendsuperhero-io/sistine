"use client";

import { SparkleIcon, TrashIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import * as React from "react";
import { writeRampConfig } from "@/components/auto-foreground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  apcaContrast,
  chromaRamp,
  clampToGamut,
  formatOklch,
  glassSurface,
  hueRamp,
  lightnessRamp,
  lightnessRampColors,
  maxP3Chroma,
  maxSrgbChroma,
  pickForeground,
} from "@/lib/oklch-utils";
import { cn } from "@/lib/utils";

// The base hue tracks the CHOSEN THEME COLOR (the header's glass tint, via --glass-tint-h); the
// L / C / steps sliders refine it. No color-picking here — selecting a theme tint drives the ramps.

const AUTO_MODES = [
  {
    key: "auto",
    label: "Auto",
  },
  {
    key: "white",
    label: "White",
  },
  {
    key: "black",
    label: "Black",
  },
] as const;

// Tint strength for the live "your color on glass" preview — stronger than the global default so
// the chosen color clearly reads on the surface.
const PREVIEW_TINT_A = 0.24;

/**
 * Visual demo for lib/oklch-utils. Pick a theme color (or tune L/C/H) + a step count, compare four
 * ramps built from the SAME base (hue, chroma, lightness, gamut-safe tonal), then see your color
 * tint real <Button>/<Badge> components — which follow the top-menu glass style — with their text
 * APCA-picked. Reachable at /colors.
 */
export function OklchRampDemo() {
  const [l, setL] = React.useState(60);
  const [c, setC] = React.useState(0.15);
  const [count, setCount] = React.useState(12);
  const [wideGamut, setWideGamut] = React.useState(false);
  const [mode, setMode] = React.useState<(typeof AUTO_MODES)[number]["key"]>("auto");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  // The base HUE tracks the chosen theme color: read the live glass tint (--glass-tint-h) and follow
  // it, so picking a tint from the top menu immediately re-rolls the foreground-source ramps below.
  const [h, setH] = React.useState(255);
  const [tintActive, setTintActive] = React.useState(false);
  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const cs = getComputedStyle(root);
      const hv = Number.parseFloat(cs.getPropertyValue("--glass-tint-h"));
      if (!Number.isNaN(hv)) setH(hv);
      const av = Number.parseFloat(cs.getPropertyValue("--glass-tint-a"));
      setTintActive(!Number.isNaN(av) && av > 0);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, {
      attributes: true,
      attributeFilter: [
        "data-glass-tint",
        "style",
        "class",
      ],
    });
    return () => obs.disconnect();
  }, []);
  // Share the base color + step count with AutoForeground — it drives the site-wide foreground.
  React.useEffect(() => {
    writeRampConfig({
      l,
      c,
      h,
      count,
    });
  }, [
    l,
    c,
    h,
    count,
  ]);
  const dark = !mounted || resolvedTheme === "dark";

  const gamut = wideGamut ? "p3" : "srgb";
  // Cap chroma at the in-gamut max for this L+hue (sRGB, or P3 when the wide-gamut toggle is on), so the
  // slider and value can never show a color the screen can't render.
  const chromaMax = wideGamut ? maxP3Chroma(l, h) : maxSrgbChroma(l, h);
  const cInGamut = Math.min(c, chromaMax);
  // A neutral theme (no active tint) → achromatic base / ramps (gray), matching the foreground; an
  // active tint adds the (gamut-clamped) color. The chroma slider tunes the vividness while tinted.
  const effectiveC = tintActive ? cInGamut : 0;
  const base = {
    l,
    c: effectiveC,
    h,
  };
  const baseCss = formatOklch(base);

  // Each ramp covers the FULL range of its axis (the utility derives the steps from `count`),
  // with the seed centered at index `count`.
  // The hue ramp stays a full color wheel even when neutral (base.c 0) — there's no hue to rotate otherwise.
  const hues = hueRamp(
    {
      ...base,
      c: base.c || 0.15,
    },
    count,
  );
  // Cap the chroma sweep at the in-gamut max for THIS lightness+hue (per the wide-gamut toggle), so
  // every swatch is a distinct, real color — instead of several past the gamut all clamping to one.
  const chromas = chromaRamp(base, count, chromaMax);
  const lights = lightnessRamp(base, count);
  const tonal = lightnessRampColors(base, count).map((color) => formatOklch(clampToGamut(color, gamut)));

  // "Your color on glass": tint real components by the base color (they adopt the top-menu glass
  // style) and APCA-pick the glass text. `dark` is hydration-safe (matches the SSR default first).
  const previewSurface = glassSurface(dark, {
    h,
    c: effectiveC,
    a: PREVIEW_TINT_A,
  });
  const autoFg = formatOklch(pickForeground(previewSurface));
  const autoLc = Math.round(Math.abs(apcaContrast(autoFg, formatOklch(previewSurface))));
  const textColor = mode === "white" ? "oklch(100% 0 0)" : mode === "black" ? "oklch(15% 0 0)" : autoFg;
  const previewTintStyle = {
    "--glass-tint-h": String(h),
    "--glass-tint-c": String(effectiveC),
    "--glass-tint-a": String(PREVIEW_TINT_A),
  } as React.CSSProperties;

  return (
    <Card variant="glass" className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>OKLCH ramps</CardTitle>
        <CardDescription>
          Ramps for your current theme color — its hue tracks the top-menu tint, so picking a theme instantly re-rolls these. Tune lightness, chroma
          and steps below; all four ramps build from the same base via <code className="text-xs">lib/oklch-utils</code>. The base is centered in each;
          click a swatch to copy it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="size-4 shrink-0 rounded-full border border-[var(--glass-border)]"
            style={{
              background: `oklch(60% ${tintActive ? 0.15 : 0} ${h})`,
            }}
          />
          {tintActive ? `Tracking your theme color — hue ${Math.round(h)}°.` : "Neutral theme → achromatic (gray)."} Change it from the top-menu tint
          switcher.
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
          <Control label="Chroma" value={tintActive ? `${cInGamut.toFixed(3)} / ${chromaMax.toFixed(2)} max` : "0 · neutral"}>
            <Slider
              value={[
                cInGamut,
              ]}
              min={0}
              max={chromaMax}
              step={0.005}
              disabled={!tintActive}
              onValueChange={(v) => setC(v[0] ?? c)}
            />
          </Control>
          <Control label="Steps each side" value={String(count)}>
            <Slider
              value={[
                count,
              ]}
              min={3}
              max={12}
              step={1}
              onValueChange={(v) => setCount(v[0] ?? count)}
            />
          </Control>
        </div>

        <Ramp title="Hue ramp" colors={hues} mid={count} />
        <Ramp title={`Chroma ramp · 0 → ${wideGamut ? "P3" : "sRGB"} max`} colors={chromas} mid={count} />
        <Ramp title="Lightness ramp" colors={lights} mid={count} />

        <div className="space-y-2">
          <Ramp title={`Tonal ramp · gamut-safe tints & shades (${wideGamut ? "P3" : "sRGB"})`} colors={tonal} mid={count} />
          <label className="flex w-fit items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={wideGamut} onCheckedChange={setWideGamut} />
            Wide gamut (P3)
          </label>
        </div>

        <div className="space-y-3 border-t border-[var(--glass-border)] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium">
              Your color on glass <span className="font-normal text-muted-foreground">· real components — top-menu style + your tint</span>
            </div>
            <div className="inline-flex rounded-lg border border-[var(--glass-border)] p-0.5 text-xs">
              {AUTO_MODES.map((m) => (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={cn(
                    "rounded-md px-2 py-0.5 font-medium transition-colors",
                    mode === m.key ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2" style={previewTintStyle}>
            <Button
              variant="glass"
              style={{
                color: textColor,
              }}
            >
              <SparkleIcon weight="fill" />
              Button
            </Button>
            <Button
              variant="glass"
              size="sm"
              style={{
                color: textColor,
              }}
            >
              Small
            </Button>
            <Button variant="destructive">
              <TrashIcon />
              Delete
            </Button>
            <Badge
              variant="glass"
              style={{
                color: textColor,
              }}
            >
              Badge
            </Badge>
            <Badge
              variant="secondary"
              style={{
                color: textColor,
              }}
            >
              Secondary
            </Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Real <code className="text-[11px]">&lt;Button&gt;</code> / <code className="text-[11px]">&lt;Badge&gt;</code> components — they follow the
            glass style from the top menu and take your color as their tint. Glass text uses the APCA foreground (Lc {autoLc} on this surface);
            destructive keeps its red.
          </p>
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
