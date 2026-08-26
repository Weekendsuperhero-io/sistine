"use client";

import { BellIcon, GearIcon, HeartIcon, MagnifyingGlassIcon, StarIcon } from "@phosphor-icons/react";
import * as React from "react";
import { type FgPalette, readFgConfig, readRampConfig, writeFgConfig } from "@/components/auto-foreground";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  apcaContrast,
  boostBand,
  foregroundRamp,
  formatOklch,
  glassSolidSurface,
  HARMONIC_NAMES,
  type HarmonicName,
  harmonicHue,
  LC_MARGIN,
  type OklchColor,
  pickTonalInBand,
  READABLE_USAGE,
  type ReadableUsage,
  readableForeground,
  showThrough,
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
    sample: "Body copy: the quick brown fox jumps over the lazy dog.",
  },
  {
    key: "fine",
    label: "fine / small",
    mark: "Fn",
    usage: "small",
    cls: "text-xs",
    sample: "Fine print: the quick brown fox jumps over the lazy dog.",
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
    /* The rest of the surface model. These were missing, and the omission is why this panel disagreed
       with what AutoForeground actually emits: without them glassSolidSurface() falls back to the shared
       wash lightness and — far more significantly — models NO solidify floor at all, the single heaviest
       term in the composite at 0.7 alpha. Measured on amethyst night the panel's surface sat 3.3 L below
       the real one, shifting every Lc in the strip by ~3 and widening the zero band by a whole step. */
    washL: 58,
    washCMult: 2.5,
    solidifyL: 36.4,
    solidifyC: 0,
    glassOpacity: 0.7,
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
      const isDark = root.classList.contains("dark");
      const tintC = num("--glass-tint-c", 0);
      const moonstone = root.dataset.glassTint === "moonstone";
      // Fallbacks mirror components/auto-foreground.tsx, which is the source of truth for this model.
      const opaqueCMax = num("--glass-opaque-c-max", isDark ? 0.12 : 0.055);
      setEnv({
        h: num("--glass-fg-h", num("--glass-tint-h", 255)),
        c: tintC,
        a: num("--glass-tint-a", 0),
        dark: isDark,
        washL: num("--glass-wash-l", moonstone && isDark ? 64 : isDark ? 58 : 72),
        washCMult: num("--glass-wash-c-mult", moonstone && isDark ? 2 : 2.5),
        solidifyL: num("--glass-solidify-l", isDark ? 36.4 : 92),
        solidifyC: Math.min(
          tintC * num("--glass-opaque-c-scale", isDark ? 1.05 : 0.85),
          num("--glass-solidify-c-max", isDark ? opaqueCMax : opaqueCMax * 0.65),
        ),
        glassOpacity: Math.min(Math.max(num("--glass-opacity", 0.7), 0), 1),
        // Harmony anchor: matches CSS --harmony-h (content hue, or 0 for selenite/moonstone), so the chip hues here
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

  /* The SAME surface AutoForeground bands against — full argument list. Passing only (dark, tint, solidA)
     silently drops the per-preset wash lightness AND the solidify floor, which is what made this panel
     disagree with the tokens it is meant to explain. */
  const surface = glassSolidSurface(
    env.dark,
    {
      h: env.h,
      c: env.c,
      a: env.a,
    },
    solidA,
    env.washL,
    env.washCMult,
    {
      l: env.solidifyL,
      c: env.solidifyC,
      a: env.glassOpacity,
    },
  );
  // neutral → achromatic base; an active tint adds (gamut-clamped) color. Text uses Tonal / Linear only.
  const baseChroma = env.c > 0 ? env.base.c : 0;
  const base = {
    l: env.base.l,
    // The ramp is seeded from the COMPOSITED surface hue, not --glass-tint-h: the wash mixed over a
    // near-neutral floor lands a few degrees off the declared angle, and AutoForeground follows the
    // surface so text sits at the angle it is painted on. Using the token here showed a ramp the
    // component never draws (amethyst night: 300 vs the surface's 301.4).
    c: baseChroma,
    h: surface.h,
  };
  /* The DISPLAY ramp: one extreme (black/white) → base (center) → the opposite extreme. Twice the
     length of the pick pool on purpose — the far half is shown so the strip reads as a whole ramp, but
     a foreground is only ever drawn from the readable side. */
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

  /* The PICK, delegated to lib/oklch-utils so this panel cannot drift from what AutoForeground emits.
     It did, on every axis: no solidify floor in the surface, no tonal clip (so `Fn` marked the ramp's
     pure-WHITE end point, which the component never ships), no show-through margin, the raw tint hue
     instead of the composited one, and a pick pool twice the size the component uses. */
  const solved = foregroundRamp({
    palette,
    count: env.count,
    base,
    dark: env.dark,
  });
  const lcBoost = LC_MARGIN * showThrough(solidA, env.a, env.glassOpacity);
  /** Solve a tier and map the chosen colour back to its index in the DISPLAY ramp, for the markers. */
  const pickIdx = (rawBand: { floor: number; target: number; ceiling: number }) => {
    const pick = pickTonalInBand(solved, surface, boostBand(rawBand, lcBoost));
    const i = solved.raw.indexOf(pick);
    return i >= 0 ? i : 0;
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
              {iconHue != null ? `, ${typeof iconHue === "string" ? iconHue : "hue"} ${Math.round(iconHueVal)}°` : ""}): Lc {iconLc}
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
            (via <code>themeForeground</code>): extreme → base → extreme; each tier takes the swatch in its <strong>[floor–ceiling]</strong> band
            nearest target, so fine stays <strong>≥ 90</strong> (a floor, not a cap). Lc is modeled on the solid floor. <strong>Linear</strong> holds
            the theme&apos;s chroma; <strong>Tonal</strong> fades toward gray. Icons are separate: <code>readableForeground</code> solves lightness
            for the ui band at your chosen <strong>harmonic angle</strong> (complement / triad / split / tetrad / square, the same{" "}
            <code>--hue-*</code> tokens as the swatches), so they stay legible while tracking the theme.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
