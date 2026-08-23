"use client";

import { MagnifyingGlass as Search } from "@phosphor-icons/react";
import Link from "next/link";
import * as React from "react";
import { ReadableText } from "@/components/readable-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type OklchColor, rampAxisColors } from "@/lib/oklch-utils";
import { getComponents } from "@/lib/registry";
import { cn } from "@/lib/utils";

const components = getComponents();

// New components that should show NEW badge
const newComponents = new Set([
  "spinner",
  "button-group",
  "input-group",
  "empty-state",
  "menu-bar",
  "date-picker-input",
  "context-menu",
  "carousel",
]);

// Semantic Button variants (behavior styles), shown side-by-side.
const buttonVariantNames = [
  "default",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
] as const;

// The five materials, rendered via the `material` prop — the gradient accent is its own axis (`gradient`).
const buttonMaterialNames = [
  "glass",
  "frosted",
  "crystal",
  "chakra",
  "opaque",
] as const;

// gradient fill strengths to compare — the engine's --gradient construction (--gradient-l/-c envelope,
// --glass-fg-h + 63.53° sweep) at three alphas, so Medium (0.5) IS the accent token at every theme/mode,
// including frescoes that decouple --glass-fg-h from the tint hue.
const solidGradient = (a: number) =>
  `linear-gradient(135deg, oklch(var(--gradient-l) var(--gradient-c) calc(var(--glass-fg-h) + 63.53) / ${a}) 0%, oklch(var(--gradient-l) var(--gradient-c) var(--glass-fg-h) / ${a}) 100%)`;

const solidIntensities = [
  {
    label: "Subtle",
    note: "20%",
    bg: solidGradient(0.2),
    text: "text-foreground",
  },
  {
    label: "Medium",
    note: "50%: the glass-gradient accent",
    bg: solidGradient(0.5),
    text: "text-foreground",
  },
  {
    label: "Bold",
    note: "100%",
    bg: solidGradient(1),
    text: "text-white",
  },
] as const;

// The main glass surface types — the gradient gets overlaid on each, at each intensity.
const glassTypes = [
  "glass",
  "frosted",
  "crystal",
  "chakra",
  "opaque",
] as const;

// The four ramp axes the gradient can follow — computed in JS from the real lib/oklch-utils ramps.
const GRADIENT_AXES = [
  "hue",
  "chroma",
  "lightness",
  "tonal",
] as const;

// Tints to show the glow recoloring — each forces --glass-tint-h on its subtree, so --glass-glow
// (and the surface) shifts hue. "sistine" is the bespoke four-jewel.
const glowTints = [
  "sapphire",
  "sistine",
  "aventurine",
  "rose",
] as const;

// One button per hover effect so each is hoverable side by side (glow also has its own section above).
const effectShowcase = [
  "glow",
  "shimmer",
  "ripple",
  "lift",
  "scale",
] as const;

export default function ComponentsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  // Live tint hue (the tint switcher/picker sets --glass-tint-h on <html>) so the axis demo follows it.
  const [tintH, setTintH] = React.useState(250);
  // Prefer the wider Display-P3 chroma cap when the screen supports it (else sRGB).
  const [p3, setP3] = React.useState(false);
  React.useEffect(() => {
    const read = () => {
      const n = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--glass-tint-h"));
      if (!Number.isNaN(n)) setTintH(n);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "style",
        "data-glass-tint",
        "class",
      ],
    });
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    setP3(window.matchMedia?.("(color-gamut: p3)").matches ?? false);
  }, []);

  // Exact axis gradients from the real ramp functions (the CSS-var parameterization couldn't resolve
  // the per-element offsets reliably, so we compute the two stops here and feed them as inline styles).
  const axisGradients = React.useMemo(() => {
    const base: OklchColor = {
      l: 60,
      c: 0.15,
      h: tintH,
    };
    const mid = 8; // 8 steps/side → 17 entries, base centered at index 8
    const css = (c: OklchColor) => `oklch(${c.l}% ${c.c} ${c.h} / 0.5)`;
    const g = (ramp: OklchColor[], rev: boolean) => {
      const a = ramp[rev ? mid - 3 : mid + 3] ?? base;
      const b = ramp[mid] ?? base;
      return `linear-gradient(135deg, ${css(a)} 0%, ${css(b)} 100%), var(--glass-bg)`;
    };
    // THE shared axis mapping (rampAxisColors) — the same math the gradient + canvas backgrounds
    // render, so this demo can't drift from what an axis actually looks like.
    const gamut = p3 ? ("p3" as const) : ("srgb" as const);
    const ramps: Record<(typeof GRADIENT_AXES)[number], OklchColor[]> = {
      hue: rampAxisColors("hue", base, 8, gamut),
      chroma: rampAxisColors("chroma", base, 8, gamut),
      lightness: rampAxisColors("lightness", base, 8, gamut),
      tonal: rampAxisColors("tonal", base, 8, gamut),
    };
    return GRADIENT_AXES.map((key) => ({
      key,
      fwd: g(ramps[key], false),
      rev: g(ramps[key], true),
    }));
  }, [
    tintH,
    p3,
  ]);

  const filteredComponents = components.filter(
    (component) =>
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-4 pt-8 pb-20 relative z-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">Components</h1>
          <p className="text-lg text-muted-foreground mb-8">Browse our collection of {components.length} beautiful, glassy UI components.</p>
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4 text-muted-foreground" />}
              className="text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <Card className="mb-12 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Button variants</CardTitle>
            <CardDescription className="text-muted-foreground">
              Semantic <code className="text-xs">variant</code>s on <code className="text-xs">Button</code>: behavior styles, each riding its default
              surface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {buttonVariantNames.map((v) => (
                <Button key={v} variant={v}>
                  {v}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-12 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Button materials</CardTitle>
            <CardDescription className="text-muted-foreground">
              The five materials via the <code className="text-xs">material</code> prop, plus the <code className="text-xs">gradient</code> axis
              layering the theme-aware brand gradient over the material.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {buttonMaterialNames.map((v) => (
                <Button key={v} material={v}>
                  {v}
                </Button>
              ))}
              <Button gradient>gradient</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-12 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Gradient intensity, over each glass type</CardTitle>
            <CardDescription className="max-w-2xl text-muted-foreground">
              The theme-aware <code className="text-xs">--gradient</code> (follows the foreground hue, the tint hue unless a fresco decouples it)
              overlaid on each surface at three strengths. <strong>Medium</strong> is the winner: it's the{" "}
              <code className="text-xs">glass-gradient</code> accent class, which the <code className="text-xs">gradient</code> prop layers over any
              material. Note how <strong>Bold</strong> hides the surface (all types converge) while <strong>Subtle</strong> keeps each glass texture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid max-w-2xl grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-3">
              <span />
              {solidIntensities.map((s) => (
                <span key={s.label} className="text-center font-medium text-muted-foreground text-xs">
                  {s.label}
                </span>
              ))}
              {glassTypes.map((type) => (
                <React.Fragment key={type}>
                  <span className="pr-3 font-mono text-muted-foreground text-xs">{type}</span>
                  {solidIntensities.map((s) => (
                    <Button key={s.label} material={type} border size="sm" className="relative w-full overflow-hidden">
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                          backgroundImage: s.bg,
                        }}
                      />
                      <span className={cn("relative", s.text)}>{type}</span>
                    </Button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-12 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Gradient axes + direction</CardTitle>
            <CardDescription className="max-w-2xl text-muted-foreground">
              The brand gradient re-aimed along each ramp axis: the real <code className="text-xs">hue / chroma / lightness / tonal</code> ramps from{" "}
              <code className="text-xs">lib/oklch-utils</code>, forward and reversed. All follow the current tint hue; flip the tint up top to watch
              them shift.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid max-w-md grid-cols-[auto_1fr_1fr] items-center gap-3">
              <span />
              <span className="text-center font-medium text-muted-foreground text-xs">forward</span>
              <span className="text-center font-medium text-muted-foreground text-xs">reverse</span>
              {axisGradients.map((axis) => (
                <React.Fragment key={axis.key}>
                  <span className="pr-2 font-mono text-muted-foreground text-xs">{axis.key}</span>
                  <div
                    className="h-10 rounded-lg border border-(--glass-border)"
                    style={{
                      backgroundImage: axis.fwd,
                    }}
                  />
                  <div
                    className="h-10 rounded-lg border border-(--glass-border)"
                    style={{
                      backgroundImage: axis.rev,
                    }}
                  />
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-12 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Glow</CardTitle>
            <CardDescription className="max-w-2xl text-muted-foreground">
              The Button's <code className="text-xs">effect="glow"</code> (and the <code className="text-xs">glow</code> prop on cards, badges,
              avatars…) casts a colored shadow from <code className="text-xs">--glass-glow</code>, whose hue follows the active tint, so it recolors
              per theme. <strong>Off</strong> on the left, <strong>on</strong> across four tints. Hover any to watch it intensify.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              <div className="flex flex-col items-center gap-2">
                <Button effect="none" size="lg">
                  Off
                </Button>
                <span className="font-mono text-muted-foreground text-xs">none</span>
              </div>
              {glowTints.map((tint) => (
                <div key={tint} data-glass-tint={tint} className="flex flex-col items-center gap-2">
                  <Button effect="glow" size="lg">
                    Glow
                  </Button>
                  <span className="font-mono text-muted-foreground text-xs">{tint}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-12 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Hover effects</CardTitle>
            <CardDescription className="max-w-2xl text-muted-foreground">
              Every glass component takes an <code className="text-xs">effect</code> (or <code className="text-xs">hover</code>) prop backed by the
              shared <code className="text-xs">hoverEffects</code> variants. Hover each to see it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              {effectShowcase.map((effect) => (
                <div key={effect} className="flex flex-col items-center gap-2">
                  <Button effect={effect} size="lg">
                    {effect.charAt(0).toUpperCase() + effect.slice(1)}
                  </Button>
                  <span className="font-mono text-muted-foreground text-xs">{effect}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComponents.map((component) => (
            <Link key={component.name} href={`/docs/components/${component.name}`} className="group">
              <Card className="flex h-full flex-col transition-opacity hover:opacity-90">
                <CardHeader>
                  <div className="flex items-center justify-between mb-1">
                    <CardTitle className="text-foreground">{component.title || component.name}</CardTitle>
                    {newComponents.has(component.name) && (
                      <Badge className="border-primary/40">
                        <ReadableText accent="--primary">NEW</ReadableText>
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-muted-foreground">{component.description || "No description available"}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">View &rarr;</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No components found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
