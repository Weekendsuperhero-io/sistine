"use client";

import * as React from "react";
import { useBackground } from "@/components/background-provider";
import { useGlassBackdrop } from "@/hooks/use-glass-backdrop";
import { glassMaterial, glassVars } from "@/lib/material";
import { cn } from "@/lib/utils";

const LINES = [
  {
    side: "start",
    text: "The live blur re-samples the page behind every bubble.",
  },
  {
    side: "end",
    text: "A fixed background can skip that. Each bubble just shifts a copy.",
  },
  {
    side: "start",
    text: "Scroll this list. The frost should stay glued to the backdrop.",
  },
  {
    side: "end",
    text: "Gradient publishes the same stack the page paints, then blurs it once per bubble.",
  },
  {
    side: "start",
    text: "Pattern scenes and the canvas are many layers, so they keep the live filter.",
  },
  {
    side: "end",
    text: "A pre-blurred image is cheaper still: set --app-bg-blurred and leave the filter off.",
  },
  {
    side: "start",
    text: "Thirty bubbles reading their position once a frame is the cheap part.",
  },
  {
    side: "end",
    text: "The expensive part was asking the compositor what sat behind each one.",
  },
] as const;

/**
 * A short scrolling thread of prebaked bubbles. Gradient and the solid backdrop publish
 * `--app-bg-blurred`; those are the backgrounds a single CSS image can stand in for. Over a pattern
 * or the canvas the same bubbles stay on the live backdrop-filter, which is the one that can see
 * those scenes.
 */
export function GlassPrebakedDemo() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  useGlassBackdrop(scrollRef);
  const { background } = useBackground();
  const fixed = background === "gradient" || background === "none";

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">
        {fixed
          ? "These bubbles sample the backdrop from --app-bg-blurred. Scroll the list: the slice stays put on the page."
          : "Set the header backdrop to Gradient (or None). Pattern scenes and the canvas keep the live filter, because they are not one image."}
      </p>
      <div ref={scrollRef} className="flex h-72 flex-col gap-3 overflow-y-auto rounded-xl p-4">
        {LINES.map((line) => (
          <div
            key={line.text}
            className={cn(
              glassMaterial({
                border: true,
                prebaked: fixed,
              }).className,
              "max-w-[80%] rounded-lg px-3 py-2 text-sm text-foreground",
              line.side === "end" ? "self-end" : "self-start",
            )}
            style={glassVars({
              opacity: 0.4,
            })}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
