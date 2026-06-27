"use client";

import { BellIcon, GearIcon, HeartIcon, MagnifyingGlassIcon, StarIcon } from "@phosphor-icons/react";
import * as React from "react";
import { readRampConfig } from "@/components/auto-foreground";
import { Slider } from "@/components/ui/slider";
import {
  apcaContrast,
  formatOklch,
  glassSolidSurface,
  type OklchColor,
  READABLE_USAGE,
  type ReadableUsage,
  themeForeground,
} from "@/lib/oklch-utils";
import { cn } from "@/lib/utils";

type Tier = {
  key: string;
  label: string;
  mark: string;
  usage: ReadableUsage;
  kind: "text" | "icon";
  cls: string;
  sample: string;
};
const TIERS: Tier[] = [
  {
    key: "large",
    label: "large / heading",
    mark: "Lg",
    usage: "large",
    kind: "text",
    cls: "text-2xl font-semibold",
    sample: "Large heading",
  },
  {
    key: "body",
    label: "body (default)",
    mark: "Bd",
    usage: "body",
    kind: "text",
    cls: "text-base",
    sample: "Body copy — the quick brown fox jumps over the lazy dog.",
  },
  {
    key: "fine",
    label: "fine / small",
    mark: "Fn",
    usage: "small",
    kind: "text",
    cls: "text-xs",
    sample: "Fine print — the quick brown fox jumps over the lazy dog.",
  },
  {
    key: "ui",
    label: "ui / icons",
    mark: "UI",
    usage: "ui",
    kind: "icon",
    cls: "",
    sample: "",
  },
];

const PALETTES = [
  {
    key: "lightness",
    label: "Linear",
  },
  {
    key: "tonal",
    label: "Tonal",
  },
] as const;

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
 * Live demo of the size-tiered foregrounds. Shows the full linear/tonal ramp (via themeForeground, the
 * utility the decisions use), drifting extreme → base → opposite, with each tier's PICKED swatch ringed.
 * Picks are band-aware (floor ≤ Lc ≤ ceiling, aiming for target) on the glass-SOLID surface — and the
 * panel is pinned to that modeled base, so the displayed Lc matches what's rendered. App-only.
 */
export function ReadableTiersDemo() {
  const [solidA, setSolidA] = React.useState(0.65);
  const [palette, setPalette] = React.useState<"lightness" | "tonal">("lightness");
  const [env, setEnv] = React.useState({
    h: 255,
    c: 0,
    a: 0,
    dark: true,
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
        h: num("--glass-tint-h", 255),
        c: num("--glass-tint-c", 0),
        a: num("--glass-tint-a", 0),
        dark: root.classList.contains("dark"),
        // ramp base follows the chosen theme color (the live tint hue); l/c/count from the ramp config
        base: {
          l: r.l,
          c: r.c,
          h: num("--glass-tint-h", r.h),
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
        base: env.base,
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
  const byKey = Object.fromEntries(
    tiers.map((t) => [
      t.key,
      t,
    ]),
  );
  const pickMarks = new Map<number, string>();
  for (const t of tiers) pickMarks.set(t.idx, pickMarks.has(t.idx) ? `${pickMarks.get(t.idx)}/${t.mark}` : t.mark);
  const baseIdx = env.count;
  const leftLabel = (ramp[0]?.l ?? 100) > 50 ? "white" : "black";
  const rightLabel = leftLabel === "white" ? "black" : "white";
  const baseTone = env.dark ? "oklch(20% 0 0)" : "oklch(95% 0 0)"; // the surface model's assumed backdrop

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-foreground/15 p-0.5 text-xs">
          {PALETTES.map((p) => (
            <button
              type="button"
              key={p.key}
              onClick={() => setPalette(p.key)}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                palette === p.key ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label} ramp
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{leftLabel} (readable)</span>
          <span>base</span>
          <span>{rightLabel} (toward bg)</span>
        </div>
        <div className="flex gap-0.5">
          {ramp.map((c, i) => (
            <div key={`${i}-${formatOklch(c)}`} className="flex flex-1 flex-col items-center gap-1">
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
              <span className="h-3 text-[9px] leading-none text-muted-foreground">{pickMarks.get(i) ?? (i === baseIdx ? "base" : "")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Picks rendered on glass-solid — pinned over the modeled base so the displayed Lc matches what's shown. */}
      <div
        className="rounded-xl"
        style={{
          background: baseTone,
        }}
      >
        <div
          className="glass-solid space-y-3 rounded-xl p-4"
          style={
            {
              "--glass-solid-a": String(solidA),
            } as React.CSSProperties
          }
        >
          {tiers
            .filter((t) => t.kind === "text")
            .map((t) => (
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
          <div
            style={{
              color: byKey.ui?.fmt,
            }}
          >
            <div className="mb-2 text-xs font-medium">ui / icons — every icon × weight (same ui color); thin reads weaker than bold / fill</div>
            <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] items-center gap-x-2 gap-y-1.5">
              <span />
              {WEIGHTS.map((w) => (
                <span key={w} className="text-center text-[9px] text-muted-foreground">
                  {w}
                </span>
              ))}
              {ICONS.map(({ Icon, name }) => (
                <React.Fragment key={name}>
                  <span className="text-[9px] text-muted-foreground">{name}</span>
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-foreground">
              {[
                "tier",
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
                  <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{t.l}%</td>
                  <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{t.chroma}</td>
                  <td className="border border-foreground/15 px-3 py-1.5 text-center font-semibold text-foreground tabular-nums">
                    {t.lc}{" "}
                    <span className="font-normal text-[10px] text-muted-foreground">
                      / {band.floor}–{band.ceiling}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        The strip is the full <strong>{palette === "lightness" ? "linear" : "tonal"}</strong> ramp (via{" "}
        <code className="text-[11px]">themeForeground</code>) — extreme → base → extreme. Each tier takes the swatch landing in its{" "}
        <strong>[floor–ceiling]</strong> band closest to target, so fine stays <strong>≥ 90</strong> (a floor, not a cap). The panel is pinned over
        the surface model&apos;s base, so the <strong>Lc matches what&apos;s rendered</strong>. <strong>Linear</strong> holds the theme&apos;s chroma;{" "}
        <strong>Tonal</strong> fades to gray at the extreme.
      </p>
    </div>
  );
}
