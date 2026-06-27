"use client";

import { BellIcon, GearIcon, HeartIcon, MagnifyingGlassIcon, StarIcon } from "@phosphor-icons/react";
import * as React from "react";
import { readRampConfig } from "@/components/auto-foreground";
import { Slider } from "@/components/ui/slider";
import { apcaContrast, formatOklch, glassSolidSurface, type OklchColor, themeForeground } from "@/lib/oklch-utils";
import { cn } from "@/lib/utils";

type Tier = {
  key: string;
  label: string;
  mark: string;
  target: number;
  kind: "text" | "icon";
  cls: string;
  sample: string;
};
const TIERS: Tier[] = [
  {
    key: "large",
    label: "large / heading",
    mark: "Lg",
    target: 58,
    kind: "text",
    cls: "text-2xl font-semibold",
    sample: "Large heading",
  },
  {
    key: "body",
    label: "body (default)",
    mark: "Bd",
    target: 80,
    kind: "text",
    cls: "text-base",
    sample: "Body copy — the quick brown fox jumps over the lazy dog.",
  },
  {
    key: "fine",
    label: "fine / small",
    mark: "Fn",
    target: 90,
    kind: "text",
    cls: "text-xs",
    sample: "Fine print — the quick brown fox jumps over the lazy dog.",
  },
  {
    key: "ui",
    label: "ui / icons",
    mark: "UI",
    target: 52,
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

/**
 * Live demo of the size-tiered foregrounds. Shows the actual linear/tonal ramp (via themeForeground —
 * the utility the decisions use) drifting from the readable extreme (black/white) toward the base
 * color, with the swatch each tier PICKS ringed. The picks render as real text + icons on a glass-solid
 * panel; the Lc is measured against that solid floor. Toggle Linear↔Tonal to see chroma hold vs fade.
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

  const tiers = TIERS.map((t) => {
    let idx = 0;
    let err = Number.POSITIVE_INFINITY;
    ramp.forEach((c, i) => {
      const e = Math.abs(lcOf(c) - t.target);
      if (e < err) {
        err = e;
        idx = i;
      }
    });
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
  const baseIdx = env.count; // the base color sits at the center of the full ramp
  const leftLabel = (ramp[0]?.l ?? 100) > 50 ? "white" : "black";
  const rightLabel = leftLabel === "white" ? "black" : "white";

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

      {/* The ramp the decisions draw from — extreme (black/white) → base; picked swatches are ringed. */}
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

      {/* The picks rendered as real text + icons on the solid surface. */}
      <div
        className="glass-solid space-y-2 rounded-xl p-4"
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
          className="flex items-center gap-3"
          style={{
            color: byKey.ui?.fmt,
          }}
        >
          <GearIcon size={20} weight="bold" />
          <HeartIcon size={20} weight="fill" />
          <StarIcon size={20} weight="fill" />
          <BellIcon size={20} weight="bold" />
          <MagnifyingGlassIcon size={20} weight="bold" />
          <span className="text-sm font-medium">UI / icons</span>
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
                "Lc",
              ].map((h) => (
                <th key={h} className="border border-foreground/15 px-3 py-1.5 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {tiers.map((t) => (
              <tr key={t.key}>
                <td className="border border-foreground/15 px-3 py-1.5">{t.label}</td>
                <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{t.l}%</td>
                <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{t.chroma}</td>
                <td className="border border-foreground/15 px-3 py-1.5 text-center font-semibold text-foreground tabular-nums">{t.lc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        The strip is the full <strong>{palette === "lightness" ? "linear" : "tonal"}</strong> ramp (via{" "}
        <code className="text-[11px]">themeForeground</code>) — both sides, from one extreme through the <strong>base</strong> (center) to the other;
        foregrounds are picked from the readable side (the high-contrast end). <strong>Linear</strong> holds the theme&apos;s chroma (soft tinted
        white); <strong>Tonal</strong> fades chroma to gray at the extreme. Measured on the glass-solid surface.
      </p>
    </div>
  );
}
