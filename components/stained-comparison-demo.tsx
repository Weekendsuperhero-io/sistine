"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

const SAMPLE = "The quick brown fox jumps over the lazy dog — is this still legible?";

/**
 * Side-by-side proof of the diffuse axis\u2019 DYED mode (`diffuse="stained"`) — real stained-glass optics. Both cards are CRYSTAL over
 * the same BUSY multicolor backdrop: the stained card collapses the backdrop to luminance and re-dyes
 * it toward the live theme hue (tonal shades of the tint), while the plain card lets the backdrop's
 * own colors push through. The slider drives --glass-stain-sat (dye depth); flip the tint up top and
 * the dye follows.
 */
export function StainedComparisonDemo() {
  const [sat, setSat] = React.useState(3);

  return (
    <div
      className="flex flex-col gap-4"
      style={
        {
          "--glass-stain-sat": sat,
        } as React.CSSProperties
      }
    >
      <div className="relative overflow-hidden rounded-xl p-4">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, oklch(0.72 0.19 25) 0 14px, oklch(0.78 0.17 90) 14px 28px, oklch(0.7 0.16 200) 28px 42px, oklch(0.68 0.2 300) 42px 56px)",
          }}
        />
        <div className="relative grid gap-4 sm:grid-cols-2">
          <Card material="crystal" border diffuse="stained">
            <CardHeader>
              <CardTitle className="text-base">
                <code className="text-xs">stained</code> — backdrop re-dyed to the theme hue
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{SAMPLE}</CardContent>
          </Card>

          <Card material="crystal" border>
            <CardHeader>
              <CardTitle className="text-base">plain crystal — backdrop keeps its colors</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{SAMPLE}</CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-muted-foreground text-xs">
          <code className="text-xs">--glass-stain-sat</code>
        </span>
        <Slider
          value={[
            sat,
          ]}
          min={0}
          max={6}
          step={0.25}
          onValueChange={(v) => setSat(v[0] ?? 3)}
          aria-label="stain dye depth"
        />
        <span className="w-9 text-right text-muted-foreground text-xs tabular-nums">{sat.toFixed(2)}</span>
      </div>
    </div>
  );
}
