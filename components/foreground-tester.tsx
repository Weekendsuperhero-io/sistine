"use client";

import { BellIcon, GearIcon, HeartIcon, MagnifyingGlassIcon, StarIcon } from "@phosphor-icons/react";
import * as React from "react";
import { type FgPalette, readFgConfig, readRampConfig, writeFgConfig } from "@/components/auto-foreground";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  apcaContrast,
  formatOklch,
  glassSolidSurface,
  HARMONIC_NAMES,
  type HarmonicName,
  harmonicHue,
  type OklchColor,
  READABLE_USAGE,
  type ReadableUsage,
  readableForeground,
  themeForeground,
} from "@/lib/oklch-utils";
import { cn } from "@/lib/utils";

type Tier = {
  key: string;
  label: string;
  mark: string;
  usage: ReadableUsage;
  cls: string;
  sample: string;
};
// Text size tiers only — icons are a separate readableForeground demo (below), not a text-ramp pick.
const TIERS: Tier[] = [
  {
    key: "large",
    label: "large / heading",
    mark: "Lg",
    usage: "large",
    cls: "text-2xl font-semibold",
    sample: "Large heading",
  },
  {
    key: "body",
    label: "body (default)",
    mark: "Bd",
    usage: "body",
    cls: "text-base",
    sample: "Body copy — the quick brown fox jumps over the lazy dog.",
  },
  {
    key: "fine",
    label: "fine / small",
    mark: "Fn",
    usage: "small",
    cls: "text-xs",
    sample: "Fine print — the quick brown fox jumps over the lazy dog.",
  },
];

const PALETTE_LABELS: Record<FgPalette, string> = {
  tonal: "Tonal",
  lightness: "Linear",
  hue: "Hue",
  chroma: "Chroma",
};
// Text foreground uses Tonal / Linear only — they vary lightness, so they can size-tier. (Hue / Chroma hold
// lightness constant → constant contrast; that belongs to icons, demoed separately below.)
const DEFAULT_PALETTES: FgPalette[] = [
  "lightness",
  "tonal",
];

const ICONS = [
  {
    Icon: GearIcon,
    name: "gear",
  },
  {
    Icon: HeartIcon,
    name: "heart",
  },
  {
    Icon: StarIcon,
    name: "star",
  },
  {
    Icon: BellIcon,
    name: "bell",
  },
  {
    Icon: MagnifyingGlassIcon,
    name: "search",
  },
];
const WEIGHTS = [
  "thin",
  "light",
  "regular",
  "bold",
  "fill",
] as const;

/**
 * The Foreground source tester. Picks each TEXT tier (large / body / fine) from the chosen Tonal/Linear
 * ramp via themeForeground, band-picked (floor ≤ Lc ≤ ceiling) on the glass-SOLID surface. With `live`,
 * the ramp tabs set the site's text foreground (fgConfig → AutoForeground). Icons are a separate, local
 * readableForeground demo — lightness solved for the ui band at an optional hue. App-only.
 */
export function ForegroundTester({ live = false, palettes = DEFAULT_PALETTES }: { live?: boolean; palettes?: FgPalette[] } = {}) {
  const [solidA, setSolidA] = React.useState(0.65);
  const [palette, setPaletteState] = React.useState<FgPalette>(palettes[0] ?? "lightness");
  // Icon-hue: when `live`, writes fgConfig.iconHue → AutoForeground sets the site `--foreground-ui`
  // (consumed by `text-foreground-ui` everywhere); the preview below mirrors it via readableForeground.
  const [iconHue, setIconHueState] = React.useState<number | HarmonicName | null>(null);
  // When `live`, the ramp tabs drive the site TEXT foreground + icon hue (fgConfig → AutoForeground); sync from saved.
  React.useEffect(() => {
    if (live) {
      const fg = readFgConfig();
      setPaletteState(fg.palette);
      setIconHueState(fg.iconHue);
    }
  }, [
    live,
  ]);
  const setPalette = (p: FgPalette) => {
    setPaletteState(p);
    if (live)
      writeFgConfig({
        palette: p,
      });
  };
  const setIconHue = (hue: number | HarmonicName | null) => {
    setIconHueState(hue);
    if (live)
      writeFgConfig({
        iconHue: hue,
      });
  };
  const [env, setEnv] = React.useState({
    h: 255,
    c: 0,
    a: 0,
    dark: true,
    harmonyH: 255,
    base: {
      l: 60,
      c: 0.15,
      h: 255,
    },
    count: 12,
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const cs = getComputedStyle(root);
      const num = (n: string, fb: number) => {
        const v = Number.parseFloat(cs.getPropertyValue(n));
        return Number.isNaN(v) ? fb : v;
      };
      const r = readRampConfig();
      setEnv({
        h: num("--glass-fg-h", num("--glass-tint-h", 255)),
        c: num("--glass-tint-c", 0),
        a: num("--glass-tint-a", 0),
        dark: root.classList.contains("dark"),
        // Harmony anchor: matches CSS --harmony-h (content hue, or 0 for neutral/bone), so the chip hues here
        // land on the same angle as the --hue-* swatches. Falls back to the content hue when unset (jewels).
        harmonyH: num("--harmony-h", num("--glass-fg-h", num("--glass-tint-h", r.h))),
        // ramp base follows the theme color: hue = tint, chroma = the config's (raw; gated per-palette in render)
        base: {
          l: r.l,
          c: r.c,
          h: num("--glass-fg-h", num("--glass-tint-h", r.h)),
        },
        count: r.count,
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, {
      attributes: true,
      attributeFilter: [
        "class",
        "data-glass-tint",
        "style",
      ],
    });
    window.addEventListener("sistine-fg", read);
    return () => {
      obs.disconnect();
      window.removeEventListener("sistine-fg", read);
    };
  }, []);

  const surface = glassSolidSurface(
    env.dark,
    {
      h: env.h,
      c: env.c,
      a: env.a,
    },
    solidA,
  );
  // neutral → achromatic base; an active tint adds (gamut-clamped) color. Text uses Tonal / Linear only.
  const baseChroma = env.c > 0 ? env.base.c : 0;
  const base = {
    l: env.base.l,
    c: baseChroma,
    h: env.base.h,
  };
  // The full ramp: one extreme (black/white) → base (center) → the opposite extreme; picks come from the readable side.
  const ramp: OklchColor[] = Array.from(
    {
      length: 2 * env.count + 1,
    },
    (_, level) =>
      themeForeground({
        palette,
        level,
        count: env.count,
        base,
        dark: env.dark,
      }),
  );
  const lcOf = (c: OklchColor) => Math.abs(apcaContrast(c, surface));

  // Band-aware pick (honor floor ≤ Lc ≤ ceiling, aim for target), returning the ramp index.
  const pickIdx = (band: { floor: number; target: number; ceiling: number }) => {
    const scored = ramp.map((c, i) => ({
      i,
      lc: lcOf(c),
    }));
    const inBand = scored.filter((s) => s.lc >= band.floor && s.lc <= band.ceiling);
    const pool = inBand.length ? inBand : scored;
    const err = (lc: number) => (inBand.length ? Math.abs(lc - band.target) : Math.min(Math.abs(lc - band.floor), Math.abs(lc - band.ceiling)));
    return pool.reduce((best, s) => (err(s.lc) < err(best.lc) ? s : best), pool[0]).i;
  };

  const tiers = TIERS.map((t) => {
    const idx = pickIdx(READABLE_USAGE[t.usage]);
    const color = ramp[idx];
    return {
      ...t,
      idx,
      fmt: formatOklch(color),
      l: Math.round(color.l),
      chroma: color.c.toFixed(3),
      lc: Math.round(lcOf(color)),
    };
  });
  const pickMarks = new Map<number, string>();
  for (const t of tiers) pickMarks.set(t.idx, pickMarks.has(t.idx) ? `${pickMarks.get(t.idx)}/${t.mark}` : t.mark);
  const baseIdx = env.count;
  const leftLabel = (ramp[0]?.l ?? 100) > 50 ? "white" : "black";
  const rightLabel = leftLabel === "white" ? "black" : "white";
  // Icons: lightness solved for the ui band (APCA). A harmonic name rotates off the harmony anchor (matching
  // the --hue-* tokens); a number pins one; null → follow the theme. Mirrors AutoForeground's --foreground-ui.
  const iconHueVal = typeof iconHue === "string" ? harmonicHue(env.harmonyH, iconHue) : typeof iconHue === "number" ? iconHue : env.base.h;
  const iconChroma = iconHue != null ? 0.15 : env.c > 0 ? env.base.c : 0;
  const iconFg = readableForeground(surface, {
    usage: "ui",
    hue: iconHueVal,
    chroma: iconChroma,
  });
  const iconColor = formatOklch(iconFg);
  const iconLc = Math.round(Math.abs(apcaContrast(iconFg, surface)));

  return (
    <div className="space-y-4 text-xs">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-foreground/15 p-0.5">
              {palettes.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPalette(p)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    palette === p ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {PALETTE_LABELS[p]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="whitespace-nowrap">Solid {Math.round(solidA * 100)}%</span>
              <Slider
                value={[
                  solidA,
                ]}
                min={0.3}
                max={0.75}
                step={0.01}
                onValueChange={(v) => setSolidA(v[0] ?? solidA)}
                className="w-28"
              />
            </div>
          </div>

          {/* The full ramp the decisions draw from — extreme → base (center) → opposite; picked swatches ringed. */}
          <div>
            <div className="mb-1 flex justify-between text-muted-foreground">
              <span>{leftLabel} (readable)</span>
              <span>base</span>
              <span>{rightLabel} (toward bg)</span>
            </div>
            <div className="flex gap-0.5">
              {ramp.map((c, i) => (
                <div key={`${i}-${formatOklch(c)}`} className="flex flex-1 flex-col items-center gap-0.5">
                  <span className="h-4 font-semibold leading-none text-foreground">{pickMarks.get(i) ?? (i === baseIdx ? "·" : "")}</span>
                  <div
                    className={cn(
                      "h-8 w-full rounded-sm",
                      pickMarks.has(i) && "ring-2 ring-foreground ring-offset-1 ring-offset-transparent",
                      i === baseIdx && !pickMarks.has(i) && "ring-1 ring-foreground/40",
                    )}
                    style={{
                      background: formatOklch(c),
                    }}
                    title={formatOklch(c)}
                  />
                  <span className="leading-none text-muted-foreground tabular-nums">{Math.round(lcOf(c))}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Picks rendered on a real glass-solid panel over the page background — the opacity slider changes it. */}
      <div
        className="glass glass-border glass-veil space-y-3 rounded-xl p-4"
        style={
          {
            "--glass-solid-a": String(solidA),
          } as React.CSSProperties
        }
      >
        {tiers.map((t) => (
          <div
            key={t.key}
            className={t.cls}
            style={{
              color: t.fmt,
            }}
          >
            {t.sample}
          </div>
        ))}
        <div className="space-y-2 border-t border-foreground/10 pt-3">
          <div className="space-y-2">
            <span className="font-medium">
              icons · <code>readableForeground</code>(ui
              {iconHue != null ? `, ${typeof iconHue === "string" ? iconHue : "hue"} ${Math.round(iconHueVal)}°` : ""}) — Lc {iconLc}
            </span>
            {/* Harmonic relationships off --harmony-h — the SAME --hue-* tokens as the swatches, but here the
                icon color is contrast-solved (readableForeground · ui band) so it stays legible on the surface.
                The dot previews each angle's live hue; the icons below recolor to the solved version. */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setIconHue(null)}
                className={cn(
                  "rounded-md border px-2 py-1 font-medium transition-colors",
                  iconHue == null
                    ? "border-foreground/40 bg-foreground/10 text-foreground"
                    : "border-foreground/15 text-muted-foreground hover:text-foreground",
                )}
              >
                off
              </button>
              {HARMONIC_NAMES.map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => setIconHue(name)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-medium transition-colors",
                    iconHue === name
                      ? "border-foreground/40 bg-foreground/10 text-foreground"
                      : "border-foreground/15 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className="size-2.5 rounded-full border border-foreground/20"
                    style={{
                      background: `oklch(0.62 0.16 var(--hue-${name}))`,
                    }}
                  />
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div
            className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] items-center gap-x-2 gap-y-1.5"
            style={{
              color: iconColor,
            }}
          >
            <span />
            {WEIGHTS.map((w) => (
              <span key={w} className="text-center text-muted-foreground">
                {w}
              </span>
            ))}
            {ICONS.map(({ Icon, name }) => (
              <React.Fragment key={name}>
                <span className="text-muted-foreground">{name}</span>
                {WEIGHTS.map((w) => (
                  <span key={w} className="flex justify-center">
                    <Icon size={20} weight={w} />
                  </span>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-foreground">
                  {[
                    "tier",
                    "color",
                    "L",
                    "chroma",
                    "Lc / band",
                  ].map((h) => (
                    <th key={h} className="border border-foreground/15 px-3 py-1.5 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {tiers.map((t) => {
                  const band = READABLE_USAGE[t.usage];
                  return (
                    <tr key={t.key}>
                      <td className="border border-foreground/15 px-3 py-1.5">{t.label}</td>
                      <td className="border border-foreground/15 px-3 py-1.5">
                        <span
                          className="inline-block size-5 rounded border border-foreground/20 align-middle"
                          style={{
                            background: t.fmt,
                          }}
                          title={t.fmt}
                        />
                      </td>
                      <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{t.l}%</td>
                      <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{t.chroma}</td>
                      <td className="border border-foreground/15 px-3 py-1.5 text-center font-semibold text-foreground tabular-nums">
                        {t.lc}{" "}
                        <span className="font-normal text-muted-foreground">
                          / {band.floor}–{band.ceiling}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-muted-foreground">
            {live ? "Picking a ramp sets the site's text foreground live. " : ""}The strip is the full <strong>{PALETTE_LABELS[palette]}</strong> ramp
            (via <code>themeForeground</code>) — extreme → base → extreme; each tier takes the swatch in its <strong>[floor–ceiling]</strong> band
            nearest target, so fine stays <strong>≥ 90</strong> (a floor, not a cap). Lc is modeled on the solid floor. <strong>Linear</strong> holds
            the theme&apos;s chroma; <strong>Tonal</strong> fades toward gray. Icons are separate — <code>readableForeground</code> solves lightness
            for the ui band at your chosen <strong>harmonic angle</strong> (complement / triad / split / tetrad / square — the same{" "}
            <code>--hue-*</code> tokens as the swatches), so they stay legible while tracking the theme.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
