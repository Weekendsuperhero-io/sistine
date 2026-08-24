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

// A spread of hues so the flavor reads across the wheel at once. Selenite (chroma 0) stays white in white/tonal
// (its own reference); in Hue mode it still sweeps, since the sweep uses the tint HUE, not its chroma.
const SWATCHES = [
  {
    label: "Selenite",
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
    label: "Aventurine",
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
 * All knobs write to <html>, so the preview cards AND every site-wide crystal surface follow.
 * Light is NOT one shared number any more: tonal is a day/night twin and hue pins its own value, so the
 * slider starts in an "auto" state that reads whatever the theme resolves and only becomes an inline
 * override once you drag it (click the Light label to hand it back). Lower is still bolder — chroma has
 * more gamut room away from white.
 */
export function CrystalGlossDemo() {
  const [mode, setMode] = React.useState<Mode>("tonal");
  /* `l` is what the slider DISPLAYS. `lAuto` means "no inline override — the theme owns it".
     This split exists because --glass-gloss-l is now mode- and flavor-dependent (97 light / 66 dark
     for tonal, a pinned 74 for hue), and an inline style on <html> outranks every stylesheet rule.
     Writing one unconditionally on mount — which is what this did — froze the value, so toggling
     day/night moved every other token and left the gloss behind. */
  const [l, setL] = React.useState(97);
  const [lAuto, setLAuto] = React.useState(true);
  const [tint, setTint] = React.useState(4.25);
  /* Whether Tint is still the theme's (a preset may override --glass-gloss-tint), mirroring lAuto.
     While auto, apply() must NOT write the inline prop — that is what shadowed moonstone's override. */
  const [tintAuto, setTintAuto] = React.useState(true);
  const [span, setSpan] = React.useState(40);
  const [dir, setDir] = React.useState(1);
  const [dark, setDark] = React.useState(false);

  /* Light is stored as a PER-MODE map, the same shape the tint switcher uses for --glass-opaque-l (the
     only other mode-twinned token any control writes inline). A single shared override would re-freeze
     the twin the moment you dragged the slider: a value chosen against the L-96.5 light crystal floor
     would follow you into dark, where the floor is L 28. A legacy bare number — anything persisted
     before this was a map — parses to no override, which is the right migration: it hands those users
     back to the theme instead of restoring a value that was only ever correct in one mode. */
  const readLmap = (): {
    light?: number;
    dark?: number;
  } => {
    try {
      const raw = JSON.parse(localStorage.getItem(L_KEY) ?? "null");
      if (raw && typeof raw === "object")
        return raw as {
          light?: number;
          dark?: number;
        };
    } catch {
      // ignore storage/parse failures
    }
    return {};
  };

  /** Resolve --glass-gloss-l for the CURRENT scheme: an override if one exists, else hand it to CSS. */
  const syncL = React.useCallback(() => {
    const root = document.documentElement;
    const scheme = root.classList.contains("dark") ? "dark" : "light";
    const stored = readLmap()[scheme];
    if (typeof stored === "number") {
      root.style.setProperty("--glass-gloss-l", String(stored));
      setL(stored);
      setLAuto(false);
      return;
    }
    root.style.removeProperty("--glass-gloss-l");
    const computed = Number.parseFloat(getComputedStyle(root).getPropertyValue("--glass-gloss-l"));
    setL(Number.isFinite(computed) ? computed : 97);
    setLAuto(true);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    /* Re-resolving Light here is what makes the day/night twin visible: the class flip changes which
       CSS value applies, and if an inline override is present it has to be swapped for that scheme's. */
    const read = () => {
      setDark(root.classList.contains("dark"));
      syncL();
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "class",
      ],
    });
    return () => observer.disconnect();
  }, [
    syncL,
  ]);

  /* Span and Dir are global constants no preset overrides, so a plain inline write freezes nothing.
     TINT IS NOT: presets override --glass-gloss-tint (moonstone dials it to 1 so its pale stone does not
     get a jewel's vivid highlight), and an inline style on <html> beats every [data-glass-tint] rule.
     Stamping it on MOUNT — which this did unconditionally, with the 4.25 default when storage was empty
     — silently defeated that override on every page carrying this demo. `nt: null` means "no user
     override": the property is removed and CSS owns it, exactly as syncL does for Light. */
  const apply = (m: Mode, nt: number | null, ns: number, nd: number) => {
    const root = document.documentElement;
    root.dataset.gloss = m;
    if (nt === null) root.style.removeProperty("--glass-gloss-tint");
    else root.style.setProperty("--glass-gloss-tint", String(nt));
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
    const root = document.documentElement;
    const raw = localStorage.getItem(MODE_KEY);
    const m: Mode = raw === "white" || raw === "hue" ? raw : "tonal";
    /* No stored value means the user never touched this knob, so there is no override to re-apply. */
    const stored = localStorage.getItem(TINT_KEY);
    const parsed = stored === null ? Number.NaN : Number.parseFloat(stored);
    const T = Number.isFinite(parsed) ? parsed : null;
    const ns = Number.parseFloat(localStorage.getItem(SPAN_KEY) ?? "40");
    const nd = Number.parseFloat(localStorage.getItem(DIR_KEY) ?? "1");
    const S = Number.isFinite(ns) ? ns : 40;
    const D = nd === -1 ? -1 : 1;
    setMode(m);
    setSpan(S);
    setDir(D);
    setTintAuto(T === null);
    apply(m, T, S, D);
    /* Read AFTER apply(): with no override the inline prop is gone, so this reports what the active
       preset's CSS actually resolves — the number the slider should show, not the 4.25 global. */
    const live = Number.parseFloat(getComputedStyle(root).getPropertyValue("--glass-gloss-tint"));
    setTint(T ?? (Number.isFinite(live) ? live : 4.25));
    syncL(); /* after dataset.gloss is set, so the hue flavor's own pinned value resolves */
  }, [
    syncL,
  ]);

  const changeMode = (m: Mode) => {
    /* Switching flavor hands Light back to the theme rather than seeding a number here. The theme
       already knows the right one per flavor AND per colour scheme — tonal is a twin (97 over the
       L-96.5 light crystal floor, 66 over the L-28 dark one, because a gloss is defined relative to
       its surface and those are 68 L apart), hue pins 74 in both so its swept stops keep chroma
       headroom, and white ignores Light entirely. Duplicating those numbers here is how they drift. */
    setMode(m);
    apply(m, tintAuto ? null : tint, span, dir);
    persist(MODE_KEY, m);
    persist(L_KEY, "{}"); /* drop every override — both schemes go back to the theme */
    syncL();
  };
  /** Dragging Light overrides the CURRENT scheme only, so the other keeps the theme's own value. */
  const changeL = (v: number) => {
    const root = document.documentElement;
    const scheme = root.classList.contains("dark") ? "dark" : "light";
    const map = readLmap();
    map[scheme] = v;
    persist(L_KEY, JSON.stringify(map));
    root.style.setProperty("--glass-gloss-l", String(v));
    setL(v);
    setLAuto(false);
  };
  const changeTint = (v: number) => {
    setTint(v);
    setTintAuto(false);
    apply(mode, v, span, dir);
    persist(TINT_KEY, String(v));
  };
  const changeSpan = (v: number) => {
    setSpan(v);
    apply(mode, tintAuto ? null : tint, v, dir);
    persist(SPAN_KEY, String(v));
  };

  const changeDir = (nd: number) => {
    setDir(nd);
    apply(mode, tintAuto ? null : tint, span, nd);
    persist(DIR_KEY, String(nd));
  };

  return (
    <section className="glass glass-border w-full max-w-2xl rounded-xl p-6">
      <h2 className="mb-1 font-semibold text-foreground text-xl">Crystal flavors: white · tonal · hue</h2>
      <p className="mb-4 text-muted-foreground text-sm">
        The crystal shine has three flavors (<code className="text-xs">data-gloss</code>): <strong>White</strong> is the classic flat specular,{" "}
        <strong>Tonal</strong> is a tonally-close single-hue tint of the theme, and <strong>Hue</strong> is iridescent: the highlight sweeps hues
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
          <SliderRow
            label="Light"
            value={`${Math.round(l)}%${lAuto ? " · auto" : ""}`}
            hint={lAuto ? "follows the theme (day/night)" : "lower = bolder. Click Light to follow the theme again"}
            onLabelClick={
              lAuto
                ? undefined
                : () => {
                    /* Clear only THIS scheme's override; the other one's stays as the user left it. */
                    const scheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
                    const map = readLmap();
                    delete map[scheme];
                    persist(L_KEY, JSON.stringify(map));
                    syncL();
                  }
            }
          >
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
          <SliderRow
            label="Tint"
            value={`${tint.toFixed(2)}${tintAuto ? " · auto" : ""}`}
            hint={tintAuto ? "theme-chroma × (follows the preset)" : "theme-chroma ×. Click Tint to follow the preset again"}
            onLabelClick={
              tintAuto
                ? undefined
                : () => {
                    /* Hand --glass-gloss-tint back to CSS so a preset override (moonstone's 1) applies. */
                    try {
                      localStorage.removeItem(TINT_KEY);
                    } catch {
                      // ignore storage failures
                    }
                    setTintAuto(true);
                    apply(mode, null, span, dir);
                    const live = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--glass-gloss-tint"));
                    setTint(Number.isFinite(live) ? live : 4.25);
                  }
            }
          >
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
        {mode === "white" && <p className="text-muted-foreground text-xs">White gloss is fixed: the classic specular, no knobs.</p>}
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
      /* REQUIRED, not decorative: --glass-gloss-ink, --crystal-stack-bg and every other composed glass
         token is declared on the grouped `:root, [data-glass-tint], …` selector, so a scope only
         re-resolves them if it MATCHES that selector. Setting the raw --glass-tint-* below without this
         attribute left all six swatches inheriting <html>'s already-composed values — the row rendered
         six copies of the current site tint while claiming to be six hues (the whole point of the demo).
         This is the var-composition-resolves-at-declaration gotcha check-theme's [scope] invariant
         guards for the theme's own tokens; an inline scope has to opt in the same way. Empty value is
         enough — the presets match on `[data-glass-tint="name"]`, the engine on bare `[data-glass-tint]`. */
      data-glass-tint=""
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

function SliderRow({
  label,
  value,
  hint,
  onLabelClick,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Present when the row can be handed back to the theme — renders the label as a reset control. */
  onLabelClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>
          {onLabelClick ? (
            /* min-h keeps the hit area usable at this text size (the row is only ~16px tall). */
            <button type="button" onClick={onLabelClick} className="min-h-10 rounded underline underline-offset-2 hover:text-foreground">
              {label}
            </button>
          ) : (
            label
          )}
          {hint ? <span className="ml-1.5 text-muted-foreground/70">· {hint}</span> : null}
        </span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}
