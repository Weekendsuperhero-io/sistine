"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

const SAMPLE = "The quick brown fox jumps over the lazy dog — is this still legible?";

/**
 * Side-by-side proof of the `diffuse` axis. Both cards are CRYSTAL (identity blur: 8px) over a
 * deliberately BUSY backdrop; the slider drives --glass-diffuse (the readability blur FLOOR) on the
 * wrapper. The diffuse card's backdrop blur rises to the floor — blur(max(8px, floor)) — calming the
 * noise behind text, while the plain card keeps crystal's 8px identity so you can see exactly what the
 * axis buys. Drag to 0 and the two converge.
 */
export function DiffuseComparisonDemo() {
  const [floor, setFloor] = React.useState(12);

  return (
    <div
      className="flex flex-col gap-4"
      style={
        {
          "--glass-diffuse": `${floor}px`,
        } as React.CSSProperties
      }
    >
      {/* Busy backdrop the two cards sit OVER, so the blur floor has something to diffuse. */}
      <div className="relative overflow-hidden rounded-xl p-4">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, oklch(0.72 0.19 25) 0 14px, oklch(0.78 0.17 90) 14px 28px, oklch(0.7 0.16 200) 28px 42px, oklch(0.68 0.2 300) 42px 56px)",
          }}
        />
        <div className="relative grid gap-4 sm:grid-cols-2">
          <Card material="crystal" border diffuse>
            <CardHeader>
              <CardTitle className="text-base">
                <code className="text-xs">diffuse</code> — blur floor tracks the slider
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{SAMPLE}</CardContent>
          </Card>

          <Card material="crystal" border>
            <CardHeader>
              <CardTitle className="text-base">plain crystal — its own 8px blur</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{SAMPLE}</CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-muted-foreground text-xs">
          <code className="text-xs">--glass-diffuse</code>
        </span>
        <Slider
          value={[
            floor,
          ]}
          min={0}
          max={32}
          step={1}
          onValueChange={(v) => setFloor(v[0] ?? 12)}
          aria-label="diffuse blur floor"
        />
        <span className="w-9 text-right text-muted-foreground text-xs tabular-nums">{floor}px</span>
      </div>
    </div>
  );
}
