"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { type GradientScheme, generateBeautifulGradient, generateRandomGradient, generateSeededGradient, gradientToCSS } from "@/lib/gradient-utils";

const SCHEMES: GradientScheme[] = [
  "complementary",
  "analogous",
  "triadic",
  "monochromatic",
];

/**
 * Demos lib/gradient-utils — the oklch random / seeded / harmony gradient generator. Four schemes off
 * one base hue (generateBeautifulGradient → gradientToCSS) plus a stable seeded gradient; "Shuffle"
 * re-rolls the hue. Computed after mount so the generator's random angle can't cause a hydration mismatch.
 */
export function GradientSchemesDemo() {
  const [hue, setHue] = React.useState(265);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const swatches = React.useMemo(
    () =>
      SCHEMES.map((scheme) => ({
        scheme,
        css: mounted ? gradientToCSS(generateBeautifulGradient(hue, scheme)) : undefined,
      })),
    [
      hue,
      mounted,
    ],
  );
  const seeded = React.useMemo(
    () => (mounted ? gradientToCSS(generateSeededGradient("sistine")) : undefined),
    [
      mounted,
    ],
  );

  return (
    <section className="glass-surface w-full max-w-2xl rounded-xl p-6">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 className="font-semibold text-foreground text-xl">Gradient schemes</h2>
        <Button variant="glass" size="sm" onClick={() => setHue(Math.floor(generateRandomGradient().colors[0].h))}>
          Shuffle hue
        </Button>
      </div>
      <p className="mb-4 text-muted-foreground text-sm">
        The oklch gradient generator (<code className="text-xs">lib/gradient-utils</code>): four harmony schemes from one base hue, plus a stable
        seeded gradient — all emitted as <code className="text-xs">linear-gradient(… in oklch)</code>.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {swatches.map(({ scheme, css }) => (
          <div key={scheme} className="flex flex-col items-center gap-2">
            <div
              className="h-20 w-full rounded-lg border border-[var(--glass-border)]"
              style={{
                backgroundImage: css,
              }}
            />
            <span className="font-mono text-muted-foreground text-xs">{scheme}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <div
          className="h-10 w-full rounded-lg border border-[var(--glass-border)]"
          style={{
            backgroundImage: seeded,
          }}
        />
        <span className="font-mono text-muted-foreground text-xs">seeded("sistine") — deterministic per string</span>
      </div>
    </section>
  );
}
