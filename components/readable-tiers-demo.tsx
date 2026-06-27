"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { apcaContrast, formatOklch, glassSolidSurface, READABLE_USAGE, type ReadableUsage, readableForeground } from "@/lib/oklch-utils";

const TIERS: {
  usage: ReadableUsage;
  token: string;
  cls: string;
  sample: string;
}[] = [
  {
    usage: "large",
    token: "text-foreground-soft",
    cls: "text-2xl font-semibold",
    sample: "Large heading",
  },
  {
    usage: "body",
    token: "text-foreground",
    cls: "text-base",
    sample: "Body copy — the quick brown fox jumps over the lazy dog.",
  },
  {
    usage: "small",
    token: "text-foreground-strong",
    cls: "text-xs",
    sample: "Fine print — the quick brown fox jumps over the lazy dog.",
  },
  {
    usage: "ui",
    token: 'usage: "ui"',
    cls: "text-sm font-medium",
    sample: "◎ Control label",
  },
];

/**
 * Live demo of the size-tiered foregrounds on the glass-SOLID tier — where body text actually lives.
 * Samples render on a real glass-solid panel, tinted with the current theme color, at an adjustable
 * 30–75% opacity; the Lc is computed against that solid floor (a KNOWN surface) so it's a REAL number,
 * not the sheer-glass estimate. Updates on tint / light-dark. App-only; reuses lib/oklch-utils.
 */
export function ReadableTiersDemo() {
  const [solidA, setSolidA] = React.useState(0.65);
  const [tint, setTint] = React.useState({
    h: 255,
    c: 0,
    a: 0,
    dark: true,
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const cs = getComputedStyle(root);
      const num = (n: string, fb: number) => {
        const v = Number.parseFloat(cs.getPropertyValue(n));
        return Number.isNaN(v) ? fb : v;
      };
      setTint({
        h: num("--glass-tint-h", 255),
        c: num("--glass-tint-c", 0),
        a: num("--glass-tint-a", 0),
        dark: root.classList.contains("dark"),
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
    return () => obs.disconnect();
  }, []);

  const surface = glassSolidSurface(tint.dark, tint, solidA);
  const rows = TIERS.map((t) => {
    const fg = readableForeground(surface, {
      usage: t.usage,
    });
    return {
      ...t,
      color: formatOklch(fg),
      l: Math.round(fg.l),
      lc: Math.round(Math.abs(apcaContrast(fg, surface))),
    };
  });

  return (
    <div className="space-y-3">
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
            key={r.usage}
            className={r.cls}
            style={{
              color: r.color,
            }}
          >
            {r.sample}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">Solid opacity {Math.round(solidA * 100)}%</span>
        <Slider
          value={[
            solidA,
          ]}
          min={0.3}
          max={0.75}
          step={0.01}
          onValueChange={(v) => setSolidA(v[0] ?? solidA)}
          className="flex-1"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-foreground">
              {[
                "tier",
                "L",
                "Lc",
                "floor/target/ceiling",
              ].map((h) => (
                <th key={h} className="border border-foreground/15 px-3 py-1.5 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {rows.map((r) => {
              const band = READABLE_USAGE[r.usage];
              return (
                <tr key={r.usage}>
                  <td className="border border-foreground/15 px-3 py-1.5">
                    <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs">{r.token}</code>
                  </td>
                  <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{r.l}%</td>
                  <td className="border border-foreground/15 px-3 py-1.5 text-center font-semibold text-foreground tabular-nums">{r.lc}</td>
                  <td className="border border-foreground/15 px-3 py-1.5 text-center text-xs tabular-nums">
                    {band.floor}/{band.target}/{band.ceiling}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Rendered on the <strong>glass-solid</strong> tier — where body text actually lives — tinted with your theme color at{" "}
        {Math.round(solidA * 100)}%. The Lc is <strong>real</strong> here (the solid floor is a known surface, unlike sheer glass over a wallpaper).
        Drag the opacity, or change the theme tint / light-dark up top, and watch it hold its band.
      </p>
    </div>
  );
}
