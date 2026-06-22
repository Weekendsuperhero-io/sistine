"use client";

import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

// Shared with glass-tint-switcher: ROOT_KEY records which mode is active ("neutral" | a preset
// name | "custom"); CUSTOM_KEY holds the last custom {h,c,a}.
const ROOT_KEY = "sistine-glass-tint";
const CUSTOM_KEY = "sistine-glass-tint-custom";

function applyVars(h: number, c: number, a: number) {
  const root = document.documentElement;
  // Drop any active preset so the parameterized gradient + wash read our inline vars — a
  // bespoke preset like "sistine" overrides --glass-bg directly and would otherwise win.
  delete root.dataset.glassTint;
  root.style.setProperty("--glass-tint-h", String(h));
  root.style.setProperty("--glass-tint-c", String(c));
  root.style.setProperty("--glass-tint-a", String(a));
}

/**
 * Live custom-tint picker: three sliders writing --glass-tint-h/c/a inline on <html>, so the
 * whole site recolors as you drag. The same three numbers drop straight into a
 * [data-glass-tint="…"] preset block — "Copy CSS" hands them over ready to paste.
 */
export function GlassTintPicker() {
  const [h, setH] = React.useState(250);
  const [c, setC] = React.useState(0.07);
  const [a, setA] = React.useState(0.15);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (localStorage.getItem(ROOT_KEY) !== "custom") return;
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "null");
      if (saved && typeof saved.h === "number") {
        setH(saved.h);
        setC(saved.c);
        setA(saved.a);
        applyVars(saved.h, saved.c, saved.a);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  const apply = (nh: number, nc: number, na: number) => {
    setH(nh);
    setC(nc);
    setA(na);
    setCopied(false);
    applyVars(nh, nc, na);
    try {
      localStorage.setItem(ROOT_KEY, "custom");
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

  const css = `[data-glass-tint="custom"] {\n  --glass-tint-h: ${h};\n  --glass-tint-c: ${c};\n  --glass-tint-a: ${a};\n}`;
  const swatch = `oklch(72% ${(c * 2.5).toFixed(3)} ${h})`;

  const copy = () => {
    navigator.clipboard?.writeText(css).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="glass" size="icon" className="h-9 w-9" aria-label="Custom glass color" title="Custom glass color">
          <SlidersHorizontalIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Custom tint</span>
          <span
            className="size-6 rounded-full border border-[var(--glass-border)]"
            style={{
              background: swatch,
            }}
          />
        </div>
        <SliderRow label="Hue" value={`${h}°`}>
          <Slider
            value={[
              h,
            ]}
            min={0}
            max={360}
            step={1}
            onValueChange={(v) => apply(v[0] ?? h, c, a)}
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
            onValueChange={(v) => apply(h, v[0] ?? c, a)}
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
            onValueChange={(v) => apply(h, c, v[0] ?? a)}
          />
        </SliderRow>
        <Button variant="glass" size="sm" className="w-full" onClick={copy}>
          {copied ? "Copied!" : "Copy CSS"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function SliderRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
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
