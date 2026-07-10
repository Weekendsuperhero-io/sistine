"use client";

import * as React from "react";
import { useReadableForeground } from "@/components/readable-text";
import { Slider } from "@/components/ui/slider";
import { glassSurface } from "@/lib/oklch-utils";
import { cn } from "@/lib/utils";

// Persisted crystal flavor + gloss knobs — written on <html>, so they drive BOTH these preview cards and any
// crystal surface site-wide (flip the glass-style switcher to Crystal). Defaults match globals.css.
type Mode = "white" | "tonal" | "hue";
const MODE_KEY = "sistine-crystal";
const L_KEY = "sistine-gloss-l";
const TINT_KEY = "sistine-gloss-tint";
const SPAN_KEY = "sistine-gloss-span";
const DIR_KEY = "sistine-gloss-dir";

const MODES: {
  key: Mode;
  label: string;
}[] = [
  {
    key: "white",
    label: "White",
  },
  {
    key: "tonal",
    label: "Tonal",
  },
  {
    key: "hue",
    label: "Hue",
  },
];

// Direction options — the gloss "direction" toggle. For TONAL it flips the streak diagonal (geometry); for
// HUE it reverses the sweep ORDER (which hue lands where). White ignores it.
const DIRS: {
  dir: number;
  label: string;
}[] = [
  {
    dir: 1,
    label: "Forward",
  },
  {
    dir: -1,
    label: "Reverse",
  },
];

// A spread of hues so the flavor reads across the wheel at once. Neutral (chroma 0) stays white in white/tonal
// (its own reference); in Hue mode it still sweeps, since the sweep uses the tint HUE, not its chroma.
const SWATCHES = [
  {
    label: "Neutral",
    h: 250,
    c: 0,
    a: 0,
  },
  {
    label: "Rose",
    h: 8,
    c: 0.1,
    a: 0.15,
  },
  {
    label: "Amber",
    h: 75,
    c: 0.1,
    a: 0.15,
  },
  {
    label: "Emerald",
    h: 158,
    c: 0.1,
    a: 0.15,
  },
  {
    label: "Sapphire",
    h: 255,
    c: 0.1,
    a: 0.15,
  },
  {
    label: "Amethyst",
    h: 300,
    c: 0.1,
    a: 0.15,
  },
] as const;

/**
 * Crystal gloss playground — the three crystal flavors (data-gloss on <html>):
 *   white → flat white specular (fixed, no knobs)
 *   tonal → a tonally-close single-hue tint of the theme (Tint = chroma multiplier, Light = boldness)
 *   hue   → iridescent: the highlight sweeps hues shifted ± Hue-span around the tint hue
 * All knobs write to <html>, so the preview cards AND every site-wide crystal surface follow. Light is
 * shared by tonal + hue (lower = bolder — chroma has more gamut room away from white).
 */
export function CrystalGlossDemo() {
  const [mode, setMode] = React.useState<Mode>("tonal");
  const [l, setL] = React.useState(66);
  const [tint, setTint] = React.useState(4.25);
  const [span, setSpan] = React.useState(40);
  const [dir, setDir] = React.useState(1);
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "class",
      ],
    });
    return () => observer.disconnect();
  }, []);

  const apply = (m: Mode, nl: number, nt: number, ns: number, nd: number) => {
    const root = document.documentElement;
    root.dataset.gloss = m;
    root.style.setProperty("--glass-gloss-l", String(nl));
    root.style.setProperty("--glass-gloss-tint", String(nt));
    root.style.setProperty("--glass-gloss-hue-span", String(ns));
    root.style.setProperty("--glass-gloss-hue-dir", String(nd));
  };

  const persist = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // ignore storage failures
    }
  };

  React.useEffect(() => {
    const raw = localStorage.getItem(MODE_KEY);
    const m: Mode = raw === "white" || raw === "hue" ? raw : "tonal";
    const nl = Number.parseFloat(localStorage.getItem(L_KEY) ?? "66");
    const nt = Number.parseFloat(localStorage.getItem(TINT_KEY) ?? "4.25");
    const ns = Number.parseFloat(localStorage.getItem(SPAN_KEY) ?? "40");
    const nd = Number.parseFloat(localStorage.getItem(DIR_KEY) ?? "1");
    const L = Number.isFinite(nl) ? nl : 94;
    const T = Number.isFinite(nt) ? nt : 2;
    const S = Number.isFinite(ns) ? ns : 40;
    const D = nd === -1 ? -1 : 1;
    setMode(m);
    setL(L);
    setTint(T);
    setSpan(S);
    setDir(D);
    apply(m, L, T, S, D);
  }, []);

  const changeMode = (m: Mode) => {
    // Seed a sensible Light per flavor: tonal wants a bright highlight (94); hue wants it pulled down (74) so
    // the swept hues read as saturated color instead of near-white. White ignores Light.
    const nl = m === "hue" ? 74 : m === "tonal" ? 94 : l;
    setMode(m);
    setL(nl);
    apply(m, nl, tint, span, dir);
    persist(MODE_KEY, m);
    persist(L_KEY, String(nl));
  };
  const changeL = (v: number) => {
    setL(v);
    apply(mode, v, tint, span, dir);
    persist(L_KEY, String(v));
  };
  const changeTint = (v: number) => {
    setTint(v);
    apply(mode, l, v, span, dir);
    persist(TINT_KEY, String(v));
  };
  const changeSpan = (v: number) => {
    setSpan(v);
    apply(mode, l, tint, v, dir);
    persist(SPAN_KEY, String(v));
  };

  const changeDir = (nd: number) => {
    setDir(nd);
    apply(mode, l, tint, span, nd);
    persist(DIR_KEY, String(nd));
  };

  return (
    <section className="glass glass-border w-full max-w-2xl rounded-xl p-6">
      <h2 className="mb-1 font-semibold text-foreground text-xl">Crystal flavors — white · tonal · hue</h2>
      <p className="mb-4 text-muted-foreground text-sm">
        The crystal shine has three flavors (<code className="text-xs">data-gloss</code>): <strong>White</strong> is the classic flat specular,{" "}
        <strong>Tonal</strong> is a tonally-close single-hue tint of the theme, and <strong>Hue</strong> is iridescent — the highlight sweeps hues
        shifted up &amp; down from the tint. The knobs apply site-wide, so switching the glass style to Crystal shows the same everywhere.
      </p>

      <div className="mb-4 inline-flex rounded-lg border border-foreground/15 p-0.5">
        {MODES.map((m) => (
          <button
            type="button"
            key={m.key}
            onClick={() => changeMode(m.key)}
            className={cn(
              "rounded-md px-3 py-1 font-medium text-xs transition-colors",
              mode === m.key ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SWATCHES.map((s) => (
          <CrystalSwatch key={s.label} swatch={s} dark={dark} />
        ))}
      </div>

      <div className="space-y-3">
        {mode !== "white" && (
          <SliderRow label="Light" value={`${Math.round(l)}%`} hint="lower = bolder">
            <Slider
              value={[
                l,
              ]}
              min={60}
              max={100}
              step={1}
              onValueChange={(v) => changeL(v[0] ?? l)}
            />
          </SliderRow>
        )}
        {mode === "tonal" && (
          <SliderRow label="Tint" value={tint.toFixed(2)} hint="theme-chroma ×">
            <Slider
              value={[
                tint,
              ]}
              min={0}
              max={6}
              step={0.25}
              onValueChange={(v) => changeTint(v[0] ?? tint)}
            />
          </SliderRow>
        )}
        {mode === "hue" && (
          <SliderRow label="Hue span" value={`±${Math.round(span)}°`} hint="sweep width">
            <Slider
              value={[
                span,
              ]}
              min={0}
              max={120}
              step={5}
              onValueChange={(v) => changeSpan(v[0] ?? span)}
            />
          </SliderRow>
        )}
        {mode === "white" && <p className="text-muted-foreground text-xs">White gloss is fixed — the classic specular, no knobs.</p>}
        {mode !== "white" && (
          <div className="space-y-1.5">
            <div className="text-muted-foreground text-xs">
              Direction <span className="text-muted-foreground/70">· {mode === "hue" ? "hue sweep order" : "streak diagonal"}</span>
            </div>
            <div className="inline-flex rounded-lg border border-foreground/15 p-0.5">
              {DIRS.map((o) => (
                <button
                  type="button"
                  key={o.dir}
                  onClick={() => changeDir(o.dir)}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium text-xs transition-colors",
                    dir === o.dir ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * One crystal swatch. Its label bands against the swatch's OWN local tint surface (via
 * useReadableForeground) instead of borrowing the page `--foreground` — so it stays legible on every
 * hue in both light and dark, rather than muddying out when the page foreground doesn't match.
 */
function CrystalSwatch({ swatch, dark }: { swatch: (typeof SWATCHES)[number]; dark: boolean }) {
  const labelColor = useReadableForeground(
    glassSurface(dark, {
      h: swatch.h,
      c: swatch.c,
      a: swatch.a,
    }),
  );
  return (
    <div
      data-material="crystal"
      className="glass glass-border flex h-24 items-end rounded-lg p-2"
      style={
        {
          "--glass-tint-h": String(swatch.h),
          "--glass-tint-c": String(swatch.c),
          "--glass-tint-a": String(swatch.a),
        } as React.CSSProperties
      }
    >
      <span
        className="font-mono text-[10px]"
        style={{
          color: labelColor,
        }}
      >
        {swatch.label}
      </span>
    </div>
  );
}

function SliderRow({ label, value, hint, children }: { label: string; value: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>
          {label}
          {hint ? <span className="ml-1.5 text-muted-foreground/70">· {hint}</span> : null}
        </span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}
