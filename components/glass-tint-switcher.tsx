"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// Persistence shared with earlier versions: ROOT_KEY = the chosen base ("neutral" | preset | "custom"),
// CUSTOM_KEY = the live {h,c,a} so a tweaked tint restores exactly.
const ROOT_KEY = "sistine-glass-tint";
const CUSTOM_KEY = "sistine-glass-tint-custom";

/**
 * Each preset is just a starting point — hue + saturation + wash — that the sliders below can then
 * adjust. "Bone" is a warm, very-low-chroma off-white you can nudge further with the Saturation/Wash sliders.
 * "Sistine" is bespoke: it sets data-glass-tint so its four-jewel --glass-bg applies; its border /
 * accent / wash still respond to the sliders via the inline tint vars.
 *
 * IMPORTANT: applyTint() INLINES h/c/a onto <html>, which shadows the [data-glass-tint] CSS block. For the
 * frescoes (sistine/muse/aurora/gloaming) the h/c/a here MUST stay identical to those CSS blocks in
 * app/globals.css (the CSS is the fallback for static, no-switcher consumers) — otherwise the demo and a
 * static page render different fresco surfaces.
 */
const PRESETS = [
  {
    value: "neutral",
    label: "Neutral",
    h: 250,
    c: 0.018,
    a: 0,
    swatch: "oklch(90% 0.02 250)",
  },
  {
    value: "sistine",
    label: "Sistine",
    h: 75,
    c: 0.1,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(82% 0.12 75), oklch(80% 0.12 8), oklch(78% 0.12 255), oklch(80% 0.12 158))",
  },
  {
    value: "muse",
    label: "Muse",
    h: 230,
    c: 0.06,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(85% 0.1 222), oklch(78% 0.2 326), oklch(84% 0.12 74))",
  },
  {
    value: "aurora",
    label: "Aurora",
    h: 178,
    c: 0.07,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(85% 0.14 152), oklch(82% 0.11 196), oklch(74% 0.15 292))",
  },
  {
    value: "gloaming",
    label: "Gloaming",
    h: 32,
    c: 0.07,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(84% 0.13 62), oklch(78% 0.15 350), oklch(64% 0.14 278))",
  },
  {
    value: "bone",
    label: "Bone",
    h: 82,
    c: 0.05,
    a: 0.18,
    swatch: "oklch(90% 0.05 82)",
  },
  {
    value: "amber",
    label: "Amber",
    h: 75,
    c: 0.07,
    a: 0.16,
    swatch: "oklch(85% 0.13 75)",
  },
  {
    value: "rose",
    label: "Rose",
    h: 8,
    c: 0.07,
    a: 0.15,
    swatch: "oklch(82% 0.12 8)",
  },
  {
    value: "amethyst",
    label: "Amethyst",
    h: 300,
    c: 0.07,
    a: 0.15,
    swatch: "oklch(78% 0.13 300)",
  },
  {
    value: "sapphire",
    label: "Sapphire",
    h: 255,
    c: 0.07,
    a: 0.15,
    swatch: "oklch(78% 0.13 255)",
  },
  {
    value: "emerald",
    label: "Emerald",
    h: 158,
    c: 0.07,
    a: 0.15,
    swatch: "oklch(80% 0.13 158)",
  },
  {
    value: "carnelian",
    label: "Carnelian",
    h: 38,
    c: 0.07,
    a: 0.15,
    swatch: "oklch(78% 0.14 38)",
  },
  {
    value: "peridot",
    label: "Peridot",
    h: 128,
    c: 0.07,
    a: 0.15,
    swatch: "oklch(86% 0.16 128)",
  },
  {
    value: "turquoise",
    label: "Turquoise",
    h: 190,
    c: 0.07,
    a: 0.15,
    swatch: "oklch(82% 0.1 190)",
  },
  {
    value: "aquamarine",
    label: "Aquamarine",
    h: 215,
    c: 0.07,
    a: 0.15,
    swatch: "oklch(80% 0.11 215)",
  },
  {
    value: "tourmaline",
    label: "Tourmaline",
    h: 342,
    c: 0.07,
    a: 0.15,
    swatch: "oklch(76% 0.16 342)",
  },
] as const;

type PresetValue = (typeof PRESETS)[number]["value"] | "custom";

// Presets that own a bespoke [data-glass-tint] block in globals.css (their own --glass-bg / overrides)
// rather than just driving the tint vars: the frescoes (Sistine / Muse / Aurora / Gloaming).
const BESPOKE = new Set<string>([
  "sistine",
  "muse",
  "aurora",
  "gloaming",
]);

function applyTint(h: number, c: number, a: number, tint: string | null) {
  const root = document.documentElement;
  if (tint) {
    root.dataset.glassTint = tint;
  } else {
    delete root.dataset.glassTint;
  }
  root.style.setProperty("--glass-tint-h", String(h));
  root.style.setProperty("--glass-tint-c", String(c));
  root.style.setProperty("--glass-tint-a", String(a));
}

/**
 * One unified glass-color control: pick a preset (or dial a custom hue) and adjust Saturation + Wash
 * for any of them. Writes --glass-tint-h/c/a inline on <html>; Sistine additionally toggles its
 * bespoke data-glass-tint preset. Composes with the theme + glass-style switchers.
 */
export function GlassTintSwitcher() {
  const [base, setBase] = React.useState<PresetValue>("neutral");
  const [h, setH] = React.useState(250);
  const [c, setC] = React.useState(0.018);
  const [a, setA] = React.useState(0);

  React.useEffect(() => {
    const storedBase = (localStorage.getItem(ROOT_KEY) as PresetValue | null) ?? "neutral";
    const preset = PRESETS.find((p) => p.value === storedBase);
    let nh = preset?.h ?? 250;
    let nc = preset?.c ?? 0.018;
    let na = preset?.a ?? 0;
    try {
      const custom = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "null");
      if (custom && typeof custom.h === "number") {
        nh = custom.h;
        nc = custom.c;
        na = custom.a;
      }
    } catch {
      // ignore malformed storage
    }
    setBase(storedBase);
    setH(nh);
    setC(nc);
    setA(na);
    applyTint(nh, nc, na, BESPOKE.has(storedBase) ? storedBase : null);
  }, []);

  const persist = (b: PresetValue, nh: number, nc: number, na: number) => {
    try {
      localStorage.setItem(ROOT_KEY, b);
      localStorage.setItem(
        CUSTOM_KEY,
        JSON.stringify({
          h: nh,
          c: nc,
          a: na,
        }),
      );
    } catch {
      // ignore storage failures
    }
  };

  const choose = (p: (typeof PRESETS)[number]) => {
    setBase(p.value);
    setH(p.h);
    setC(p.c);
    setA(p.a);
    applyTint(p.h, p.c, p.a, BESPOKE.has(p.value) ? p.value : null);
    persist(p.value, p.h, p.c, p.a);
  };

  // Dragging a slider keeps a bespoke base (the frescoes) — data-glass-tint stays —
  // but overrides the tint vars; for any other base it becomes a free "custom" color.
  const tweak = (nh: number, nc: number, na: number) => {
    setH(nh);
    setC(nc);
    setA(na);
    const tint = BESPOKE.has(base) ? base : null;
    const next: PresetValue = tint ?? "custom";
    setBase(next);
    applyTint(nh, nc, na, tint);
    persist(next, nh, nc, na);
  };

  const triggerSwatch =
    base === "sistine" || base === "muse"
      ? (PRESETS.find((p) => p.value === base)?.swatch ?? "oklch(90% 0.02 250)")
      : c < 0.005
        ? "oklch(90% 0.02 250)"
        : `oklch(80% ${Math.min(0.15, c * 2).toFixed(3)} ${h})`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="glass" size="icon" className="h-9 w-9" aria-label="Glass color" title="Glass color">
          <span
            className="size-4 rounded-full border border-[var(--glass-border)]"
            style={{
              background: triggerSwatch,
            }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="font-medium text-sm">Glass color</div>

        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.value}
              onClick={() => choose(p)}
              title={p.label}
              aria-label={p.label}
              className={cn(
                "size-6 rounded-full border border-[var(--glass-border)] transition-transform active:scale-[0.96]",
                base === p.value ? "ring-2 ring-foreground/60" : "hover:scale-110",
              )}
              style={{
                background: p.swatch,
              }}
            />
          ))}
        </div>

        <SliderRow label="Hue" value={`${Math.round(h)}°`}>
          <Slider
            value={[
              h,
            ]}
            min={0}
            max={360}
            step={1}
            onValueChange={(v) => tweak(v[0] ?? h, c, a)}
          />
        </SliderRow>
        <SliderRow label="Saturation" value={c.toFixed(3)}>
          <Slider
            value={[
              c,
            ]}
            min={0}
            max={0.2}
            step={0.005}
            onValueChange={(v) => tweak(h, v[0] ?? c, a)}
          />
        </SliderRow>
        <SliderRow label="Wash" value={a.toFixed(2)}>
          <Slider
            value={[
              a,
            ]}
            min={0}
            max={0.3}
            step={0.01}
            onValueChange={(v) => tweak(h, c, v[0] ?? a)}
          />
        </SliderRow>
      </PopoverContent>
    </Popover>
  );
}

function SliderRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}
