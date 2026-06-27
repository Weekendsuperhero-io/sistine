"use client";

import * as React from "react";
import { apcaContrast, formatOklch, glassSurface, READABLE_USAGE, type ReadableUsage, readableForeground } from "@/lib/oklch-utils";

const TIERS: {
  usage: ReadableUsage;
  token: string;
  label: string;
  cls: string;
  sample: string;
}[] = [
  {
    usage: "large",
    token: "text-foreground-soft",
    label: "large / heading",
    cls: "text-2xl font-semibold",
    sample: "The quick brown fox",
  },
  {
    usage: "body",
    token: "text-foreground",
    label: "body (default)",
    cls: "text-base",
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    usage: "small",
    token: "text-foreground-strong",
    label: "fine / small",
    cls: "text-xs",
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    usage: "ui",
    token: 'usage: "ui"',
    label: "icons / controls",
    cls: "text-sm font-medium",
    sample: "◎ Control label",
  },
];

type Cell = {
  color: string;
  l: number;
  lc: number;
};

/**
 * Live demo of the size-tiered foregrounds: each tier rendered in the color readableForeground() picks
 * for the CURRENT theme surface, with the landed lightness + achieved APCA Lc. Updates on tint /
 * light-dark changes — so you can watch body sit on its target (~80, not the 90 ceiling) while large
 * eases to ~58 and fine holds ~90. App-only (a docs demo); reuses lib/oklch-utils.
 */
export function ReadableTiersDemo() {
  const [computed, setComputed] = React.useState<Partial<Record<ReadableUsage, Cell>>>({});

  React.useEffect(() => {
    const root = document.documentElement;
    const compute = () => {
      const cs = getComputedStyle(root);
      const num = (n: string, fb: number) => {
        const v = Number.parseFloat(cs.getPropertyValue(n));
        return Number.isNaN(v) ? fb : v;
      };
      const surface = glassSurface(root.classList.contains("dark"), {
        h: num("--glass-tint-h", 255),
        c: num("--glass-tint-c", 0),
        a: num("--glass-tint-a", 0),
      });
      const next: Partial<Record<ReadableUsage, Cell>> = {};
      for (const t of TIERS) {
        const fg = readableForeground(surface, {
          usage: t.usage,
        });
        next[t.usage] = {
          color: formatOklch(fg),
          l: Math.round(fg.l),
          lc: Math.round(Math.abs(apcaContrast(fg, surface))),
        };
      }
      setComputed(next);
    };
    compute();
    const obs = new MutationObserver(compute);
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-foreground">
            {[
              "tier",
              "rendered in its band",
              "L",
              "Lc",
              "floor/target/ceiling",
            ].map((h) => (
              <th key={h} className="border border-foreground/15 px-3 py-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          {TIERS.map((t) => {
            const d = computed[t.usage];
            const band = READABLE_USAGE[t.usage];
            return (
              <tr key={t.usage}>
                <td className="border border-foreground/15 px-3 py-2 align-middle">
                  <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs">{t.token}</code>
                  <div className="mt-1 text-xs">{t.label}</div>
                </td>
                <td className="border border-foreground/15 px-3 py-2 align-middle">
                  <span
                    className={t.cls}
                    style={
                      d
                        ? {
                            color: d.color,
                          }
                        : undefined
                    }
                  >
                    {t.sample}
                  </span>
                </td>
                <td className="border border-foreground/15 px-3 py-2 text-center align-middle tabular-nums">{d ? `${d.l}%` : "—"}</td>
                <td className="border border-foreground/15 px-3 py-2 text-center align-middle font-semibold text-foreground tabular-nums">
                  {d ? d.lc : "—"}
                </td>
                <td className="border border-foreground/15 px-3 py-2 text-center align-middle text-xs tabular-nums">
                  {band.floor}/{band.target}/{band.ceiling}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Live against the current theme surface — change the tint or light/dark in the top menu and watch <strong>L</strong> &amp; <strong>Lc</strong>{" "}
        move. Body lands on its <strong>target ~80</strong> (not the 90 ceiling); large eases to ~58; fine holds ~90; icons ~52.
      </p>
    </div>
  );
}
