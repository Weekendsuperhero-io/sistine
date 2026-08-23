"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

const SAMPLE = "The quick brown fox jumps over the lazy dog. Is this still legible?";

/**
 * Side-by-side proof of the `veil` axis. Both cards hold the SAME text over a deliberately BUSY
 * backdrop (vivid diagonal stripes + color blobs), so the veil's job is visible: the slider drives
 * --glass-solid-a on the wrapper, and `glass-veil` composes that alpha into its floor AT THE ELEMENT —
 * so the veiled card's floor thickens over the noise as you drag, while the plain-glass card (which
 * never reads --glass-solid-a) lets the backdrop bleed straight through and fight the text.
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
      {/* Busy backdrop the two cards sit OVER, so the veil has something to obscure. */}
      <div className="relative overflow-hidden rounded-xl p-4">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, oklch(0.72 0.19 25) 0 14px, oklch(0.78 0.17 90) 14px 28px, oklch(0.7 0.16 200) 28px 42px, oklch(0.68 0.2 300) 42px 56px)",
          }}
        />
        <div className="relative grid gap-4 sm:grid-cols-2">
          <Card border veil>
            <CardHeader>
              <CardTitle className="text-base">
                <code className="text-xs">veil</code>: floor tracks the slider
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{SAMPLE}</CardContent>
          </Card>

          <Card border>
            <CardHeader>
              <CardTitle className="text-base">plain glass: no floor</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{SAMPLE}</CardContent>
          </Card>
        </div>
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
