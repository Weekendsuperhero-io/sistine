"use client";

import * as React from "react";
import { readRampConfig } from "@/components/auto-foreground";
import { Slider } from "@/components/ui/slider";
import { apcaContrast, formatOklch, glassSolidSurface, pickByContrast, themeForeground } from "@/lib/oklch-utils";
import { cn } from "@/lib/utils";

const TIERS: {
  label: string;
  target: number;
  cls: string;
  sample: string;
}[] = [
  {
    label: "large / heading",
    target: 58,
    cls: "text-2xl font-semibold",
    sample: "Large heading",
  },
  {
    label: "body (default)",
    target: 80,
    cls: "text-base",
    sample: "Body copy — the quick brown fox jumps over the lazy dog.",
  },
  {
    label: "fine / small",
    target: 90,
    cls: "text-xs",
    sample: "Fine print — the quick brown fox jumps over the lazy dog.",
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
 * Live demo of the size-tiered foregrounds, drawn from the theme's LINEAR (lightness) ramp — which
 * holds the theme chroma, so high-contrast text reads as a soft tinted white, not gray. Toggle to the
 * Tonal ramp to watch it desaturate toward gray. Rendered on a real glass-solid panel at adjustable
 * opacity; each tier is picked to hit its contrast band on that solid floor (a real Lc). App-only.
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
        base: {
          l: r.l,
          c: r.c,
          h: r.h,
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
  const ramp = Array.from(
    {
      length: env.count + 1,
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
  const rows = TIERS.map((t) => {
    const fg = pickByContrast(ramp, surface, t.target);
    return {
      ...t,
      color: formatOklch(fg),
      l: Math.round(fg.l),
      chroma: fg.c.toFixed(3),
      lc: Math.round(Math.abs(apcaContrast(fg, surface))),
    };
  });

  return (
    <div className="space-y-3">
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

      <div
        className="glass-solid space-y-2 rounded-xl p-4"
        style={
          {
            "--glass-solid-a": String(solidA),
          } as React.CSSProperties
        }
      >
        {rows.map((r) => (
          <div
            key={r.label}
            className={r.cls}
            style={{
              color: r.color,
            }}
          >
            {r.sample}
          </div>
        ))}
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
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="border border-foreground/15 px-3 py-1.5">{r.label}</td>
                <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{r.l}%</td>
                <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{r.chroma}</td>
                <td className="border border-foreground/15 px-3 py-1.5 text-center font-semibold text-foreground tabular-nums">{r.lc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        <strong>Linear</strong> holds the theme&apos;s chroma, so high-contrast text pushes toward a soft tinted white (note the higher chroma).{" "}
        <strong>Tonal</strong> eases chroma to 0 at the extreme, desaturating toward gray. Both hit the same Lc — Linear just keeps more color. Picked
        on the glass-solid surface, where body text lives.
      </p>
    </div>
  );
}
