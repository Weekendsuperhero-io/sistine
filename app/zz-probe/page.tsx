"use client";
// TEMPORARY layer-count probe (deleted after measuring). Not part of the change.
import { useEffect, useState } from "react";
import { CanvasBackground } from "@/components/canvas-background";
import { GradientBackground } from "@/components/gradient-background";
import { PatternBackground, type PatternStyle } from "@/components/pattern-background";
import type { CanvasStyle } from "@/lib/canvas-background-utils";

const BARE = `html, body { overflow: hidden; } body header, body footer, [data-sonner-toaster], nextjs-portal { visibility: hidden; display: none; }
.glass-backdrop-layer:not([data-probe] *) { display: none; }`;

export default function Probe() {
  const [q, setQ] = useState<URLSearchParams | null>(null);
  useEffect(() => setQ(new URLSearchParams(location.search)), []);
  if (!q) return null;
  const mode = q.get("mode");
  const speed = Number(q.get("speed") ?? 0);
  const scene = q.get("scene") ?? "";
  let bg: React.ReactNode = null;
  if (mode === "wall") bg = <PatternBackground style={scene as PatternStyle} speed={speed} />;
  if (mode === "canvas") bg = <CanvasBackground style={scene as CanvasStyle} seed="sistine" animated={speed > 0} />;
  if (mode === "gradient") bg = <GradientBackground />;
  if (mode === "preview") {
    return (
      <div data-probe="" className="fixed inset-0 z-[2147483647] bg-black p-2">
        <style>{BARE}</style>
        <div
          style={{
            position: "relative",
            width: 200,
            height: 120,
            overflow: "hidden",
            contain: "paint",
          }}
        >
          <PatternBackground style={scene as PatternStyle} speed={0} preview />
        </div>
      </div>
    );
  }
  return (
    <div data-probe="" className={mode === "empty" ? "fixed inset-0 z-[2147483647] bg-black" : "fixed inset-0 z-[2147483647]"}>
      <style>{BARE}</style>
      {bg}
    </div>
  );
}
