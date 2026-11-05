"use client";

/**
 * RESEARCH ONLY: the page scripts/energy/run.mjs measures (docs/research/2026-11-04-webgpu-energy.md).
 *
 * It runs a schedule from the query, on the wall clock, so the sampler can attribute energy without
 * talking to the page:   ?start=<epoch ms>&settle=<s>&measure=<s>&order=<variant>,<variant>,…
 * Phase i covers [start + i·(settle+measure), …+settle+measure); each mounts a fresh background, waits
 * `settle` seconds (startup, shader compiles), then runs untouched for `measure` seconds. A variant is a
 * background name, plus `~noglass` to drop the glass cards. Nothing else on the page moves: no counters,
 * no clock. `&diag=1` counts the 2D canvas's frames too (by wrapping fillRect), for a separate pass.
 * `?compare=lava|gradient` instead draws that style's three renderers as still frames (t = 0) and shows
 * them side by side in an <img>, to check the ports draw the picture the 2D canvas draws.
 * Results the page can see (frame counts, sizes) land on `window.__bench`.
 */

import * as React from "react";
import { CanvasBackground } from "@/components/canvas-background";
import { PatternBackground } from "@/components/pattern-background";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GpuBackground, gpuFrames } from "./gpu-backgrounds";

const still = () => <CanvasBackground style="gradient" seed="sistine" />;

/* A Map, not an object literal. The variant names come from the URL (`?order=`), and an object lookup of a
   name like "constructor" or "toString" finds Object.prototype's function instead of undefined, so the
   fallback to `still` never ran and calling it threw or rendered garbage. A Map only returns what was set. */
const BACKGROUNDS = new Map<string, () => React.ReactNode>([
  [
    "still",
    still,
  ],
  [
    "css-clouds",
    () => <PatternBackground style="clouds" speed={8} />,
  ],
  [
    "css-aurora",
    () => <PatternBackground style="aurora" speed={8} />,
  ],
  [
    "canvas2d-gradient",
    () => <CanvasBackground style="gradient" seed="sistine" animated />,
  ],
  [
    "webgl2-gradient",
    () => <GpuBackground api="webgl2" style="gradient" />,
  ],
  [
    "webgpu-gradient",
    () => <GpuBackground api="webgpu" style="gradient" />,
  ],
  [
    "canvas2d-lava",
    () => <CanvasBackground style="lava" seed="sistine" animated />,
  ],
  [
    "webgl2-lava",
    () => <GpuBackground api="webgl2" style="lava" />,
  ],
  [
    "webgpu-lava",
    () => <GpuBackground api="webgpu" style="lava" />,
  ],
]);

/** The background for a variant NAME from the URL; anything else renders the still one. Guarded the way
 *  CodeQL's unvalidated-dynamic-method-call rule recognises (`has` before the lookup, a `typeof` check
 *  before the call): a bare `BACKGROUNDS.get(name) ?? still` was already safe at runtime, but the rule
 *  still flagged the call. */
function background(name: string): React.ReactNode {
  const draw = BACKGROUNDS.has(name) ? BACKGROUNDS.get(name) : undefined;
  return typeof draw === "function" ? draw() : still();
}

/* The site chrome stays mounted (the root layout wraps every route), so it is hidden, and so is the
   provider's own background: only the bench's background and cards draw. */
const BARE = `
html, body { overflow: hidden; }
body header, body footer, [data-sonner-toaster], nextjs-portal { visibility: hidden; }
.glass-backdrop-layer:not([data-bench] *) { display: none; }
`;

const CARDS = [
  [
    "Revenue",
    "Up 12% on last quarter",
    "Glass blurs whatever is behind it, and blurs it again on every frame that changes.",
  ],
  [
    "Active users",
    "Across all regions",
    "Four cards cover about a quarter of the window, as a dashboard would.",
  ],
  [
    "Latency",
    "p95 over the last hour",
    "The background under them is the only thing on this page that moves.",
  ],
  [
    "Deploys",
    "This week",
    "Each variant runs untouched while the SoC's energy counters are read.",
  ],
];

type Phase = {
  i: number;
  variant: string;
  frames?: number;
  seconds?: number;
};

declare global {
  interface Window {
    __bench?: {
      info: Record<string, unknown>;
      phases: Phase[];
      canvasFrames: number;
    };
  }
}

/** The three renderers of one style, as still frames side by side (2D canvas · WebGL2 · WebGPU). */
function Compare({ style }: { style: "gradient" | "lava" }) {
  const [src, setSrc] = React.useState<string | null>(null);
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const [c2d, gl, gpu] = [
        "c2d",
        "gl",
        "gpu",
      ].map((id) => document.querySelector<HTMLCanvasElement>(`[data-cmp="${id}"] canvas`));
      const out = document.createElement("canvas");
      out.width = 1440;
      out.height = 330;
      const x = out.getContext("2d");
      if (!x) return;
      x.fillStyle = "#000";
      x.fillRect(0, 0, out.width, out.height);
      x.font = "16px monospace";
      [
        c2d,
        gl,
        gpu,
      ].forEach((canvas, i) => {
        if (canvas) x.drawImage(canvas, i * 480, 30, 470, 294);
        x.fillStyle = "#fff";
        x.fillText(
          [
            "2D canvas",
            "WebGL2",
            "WebGPU",
          ][i],
          i * 480 + 4,
          20,
        );
      });
      setSrc(out.toDataURL("image/png"));
    }, 2500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <>
      <div data-cmp="c2d">
        <CanvasBackground style={style} seed="sistine" />
      </div>
      <div data-cmp="gl">
        <GpuBackground api="webgl2" style={style} animated={false} preserve />
      </div>
      <div data-cmp="gpu">
        <GpuBackground api="webgpu" style={style} animated={false} />
      </div>
      {/* biome-ignore lint/performance/noImgElement: a data: URL built in the page; next/image has nothing to optimise. */}
      {src ? <img src={src} alt="" className="fixed inset-x-0 top-0 z-10 w-full" /> : null}
    </>
  );
}

export function Bench() {
  const [compare, setCompare] = React.useState<"gradient" | "lava" | null>(null);
  React.useEffect(() => {
    const c = new URLSearchParams(location.search).get("compare");
    if (c === "gradient" || c === "lava") setCompare(c);
  }, []);
  if (compare) {
    return (
      <div data-bench="" className="fixed inset-0 z-50">
        <style>{BARE}</style>
        <Compare style={compare} />
      </div>
    );
  }
  return <Schedule />;
}

function Schedule() {
  const [plan, setPlan] = React.useState<{
    start: number;
    settle: number;
    measure: number;
    order: string[];
    diag: boolean;
  } | null>(null);
  const [phase, setPhase] = React.useState(-1); // -1 = before the start, order.length = done

  React.useEffect(() => {
    const q = new URLSearchParams(location.search);
    const order = (q.get("order") ?? "still").split(",").filter(Boolean);
    const p = {
      start: Number(q.get("start") ?? Date.now()),
      settle: Number(q.get("settle") ?? 5),
      measure: Number(q.get("measure") ?? 30),
      order,
      diag: q.get("diag") === "1",
    };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    window.__bench = {
      info: {
        ua: navigator.userAgent,
        webgpu: "gpu" in navigator,
        dpr: window.devicePixelRatio,
        css: [
          window.innerWidth,
          window.innerHeight,
        ],
        backing: [
          Math.round(window.innerWidth * dpr),
          Math.round(window.innerHeight * dpr),
        ],
        dark: document.documentElement.classList.contains("dark"),
        tint: document.documentElement.dataset.glassTint,
        page: document.documentElement.dataset.glass,
      },
      phases: [],
      canvasFrames: 0,
    };
    if (p.diag) {
      // Count the 2D canvas's frames: each style fills the visible canvas once per frame.
      const fill = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillRect = function (...args) {
        if (this.canvas.isConnected && window.__bench) window.__bench.canvasFrames++;
        return fill.apply(this, args);
      };
    }
    setPlan(p);
  }, []);

  // Advance on the wall clock, and count frames over each measured window (settle excluded).
  React.useEffect(() => {
    if (!plan) return;
    const len = (plan.settle + plan.measure) * 1000;
    const index = Date.now() < plan.start ? -1 : Math.min(plan.order.length, Math.floor((Date.now() - plan.start) / len));
    if (index !== phase) {
      setPhase(index);
      return;
    }
    if (index >= plan.order.length) return;
    const phaseStart = plan.start + Math.max(0, index) * len;
    const timers: number[] = [];
    if (index >= 0) {
      const b = window.__bench;
      let gpu0 = 0;
      let canvas0 = 0;
      timers.push(
        window.setTimeout(
          () => {
            gpu0 = gpuFrames.count;
            canvas0 = b?.canvasFrames ?? 0;
          },
          phaseStart + plan.settle * 1000 - Date.now(),
        ),
      );
      timers.push(
        window.setTimeout(
          () => {
            const frames = plan.order[index].includes("canvas2d") ? (b?.canvasFrames ?? 0) - canvas0 : gpuFrames.count - gpu0;
            b?.phases.push({
              i: index,
              variant: plan.order[index],
              frames,
              seconds: plan.measure,
            });
          },
          phaseStart + len - 50 - Date.now(),
        ),
      );
    }
    timers.push(window.setTimeout(() => setPhase(index + 1), (index < 0 ? plan.start : phaseStart + len) - Date.now()));
    return () => timers.forEach(clearTimeout);
  }, [
    plan,
    phase,
  ]);

  const variant = plan && phase >= 0 && phase < plan.order.length ? plan.order[phase] : "still";
  const [bg, flag] = variant.split("~");
  const glass = flag !== "noglass";
  const label = !plan
    ? "loading"
    : phase < 0
      ? "waiting for the start"
      : phase >= plan.order.length
        ? "done"
        : `${phase + 1}/${plan.order.length} · ${variant}`;

  return (
    <div data-bench="" className="fixed inset-0 z-50 flex items-center justify-center p-10">
      <style>{BARE}</style>
      <React.Fragment key={phase}>{background(bg)}</React.Fragment>
      <p className="fixed top-3 left-4 text-xs font-mono opacity-70" data-bench-label="">
        {label}
      </p>
      {glass ? (
        <div className="grid w-full max-w-5xl grid-cols-2 gap-6">
          {CARDS.map(([title, description, body]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">{body}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
