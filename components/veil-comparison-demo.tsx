"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

const SAMPLE = "The quick brown fox jumps over the lazy dog — is this still legible?";

/**
 * Side-by-side proof of the `veil` axis. Both cards hold the SAME text; the slider drives
 * --glass-solid-a on the shared wrapper. `glass-veil` composes that alpha into its floor AT THE
 * ELEMENT, so the veiled card's legibility floor solidifies as you drag — while the plain-glass card
 * never reads --glass-solid-a, so its readability rides entirely on whatever's behind it.
 */
export function VeilComparisonDemo() {
  const [solidA, setSolidA] = React.useState(0.65);

  return (
    <div
      className="flex flex-col gap-4"
      style={
        {
          "--glass-solid-a": solidA,
        } as React.CSSProperties
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Card border veil>
          <CardHeader>
            <CardTitle className="text-base">
              <code className="text-xs">veil</code> — floor tracks the slider
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">{SAMPLE}</CardContent>
        </Card>

        <Card border>
          <CardHeader>
            <CardTitle className="text-base">plain glass — no floor</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">{SAMPLE}</CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-muted-foreground text-xs">
          <code className="text-xs">--glass-solid-a</code>
        </span>
        <Slider
          value={[
            solidA,
          ]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={(v) => setSolidA(v[0] ?? 0.65)}
          aria-label="veil floor opacity"
        />
        <span className="w-9 text-right text-muted-foreground text-xs tabular-nums">{Math.round(solidA * 100)}%</span>
      </div>
    </div>
  );
}
