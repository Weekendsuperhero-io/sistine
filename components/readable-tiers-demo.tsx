"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { apcaContrast, glassSolidSurface, parseOklch } from "@/lib/oklch-utils";

const TIERS: {
  token: string;
  label: string;
  cls: string;
  sample: string;
}[] = [
  {
    token: "--foreground-soft",
    label: "large / heading",
    cls: "text-2xl font-semibold",
    sample: "Large heading",
  },
  {
    token: "--foreground",
    label: "body (default)",
    cls: "text-base",
    sample: "Body copy — the quick brown fox jumps over the lazy dog.",
  },
  {
    token: "--foreground-strong",
    label: "fine / small",
    cls: "text-xs",
    sample: "Fine print — the quick brown fox jumps over the lazy dog.",
  },
];

/**
 * Live demo of the size-tiered foregrounds. Each tier is read straight from the token AutoForeground
 * sets — a COLOR drawn from the theme's tonal/lightness ramp (not gray) — shown on a real glass-solid
 * panel (where body text lives) at an adjustable 30–75% opacity, with its landed L, chroma, and the
 * APCA Lc against that solid floor (a real number). Updates on tint / light-dark. App-only.
 */
export function ReadableTiersDemo() {
  const [solidA, setSolidA] = React.useState(0.65);
  const [state, setState] = React.useState<{
    vals: Record<string, string>;
    h: number;
    c: number;
    a: number;
    dark: boolean;
  }>({
    vals: {},
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
      const vals: Record<string, string> = {};
      for (const t of TIERS) vals[t.token] = cs.getPropertyValue(t.token).trim();
      setState({
        vals,
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

  const surface = glassSolidSurface(
    state.dark,
    {
      h: state.h,
      c: state.c,
      a: state.a,
    },
    solidA,
  );
  const rows = TIERS.map((t) => {
    const color = state.vals[t.token] || "currentColor";
    const parsed = parseOklch(color);
    return {
      ...t,
      color,
      l: parsed ? Math.round(parsed.l) : null,
      chroma: parsed ? parsed.c.toFixed(3) : "—",
      lc: parsed ? Math.round(Math.abs(apcaContrast(parsed, surface))) : null,
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
            key={r.token}
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
                "chroma",
                "Lc",
              ].map((htxt) => (
                <th key={htxt} className="border border-foreground/15 px-3 py-1.5 text-left font-semibold">
                  {htxt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {rows.map((r) => (
              <tr key={r.token}>
                <td className="border border-foreground/15 px-3 py-1.5">
                  <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs">{r.token}</code>
                  <div className="mt-1 text-xs">{r.label}</div>
                </td>
                <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{r.l == null ? "—" : `${r.l}%`}</td>
                <td className="border border-foreground/15 px-3 py-1.5 text-center tabular-nums">{r.chroma}</td>
                <td className="border border-foreground/15 px-3 py-1.5 text-center font-semibold text-foreground tabular-nums">{r.lc ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Each foreground is a <strong>real color from the theme&apos;s tonal ramp</strong> (note the non-zero chroma), picked to hit its contrast band
        on the glass-solid surface — body &amp; large carry the theme color; fine stays crisp (high contrast ⇒ near-neutral). Drag the opacity or
        change the theme up top.
      </p>
    </div>
  );
}
