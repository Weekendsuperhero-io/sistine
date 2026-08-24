"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// Persistence shared with earlier versions: ROOT_KEY = the chosen base ("selenite" | preset | "custom"),
// CUSTOM_KEY = the live {h,c,a} so a tweaked tint restores exactly.
const ROOT_KEY = "sistine-glass-tint";
const CUSTOM_KEY = "sistine-glass-tint-custom";
const OPACITY_KEY = "sistine-glass-opacity";
/* Mirrors the --glass-opacity fallback in @utility glass (app/theme/utilities.css). The slider has to
   START where the stylesheet already is, or the readout lies about the surface until you drag it. */
const GLASS_OPACITY_DEFAULT = 0.7;
const DIFFUSE_KEY = "sistine-glass-diffuse";
const STAINED_KEY = "sistine-glass-stained";

/** Material identity blur radii (engine.css defaults). The site-wide Diffuse slider raises each token
 * to max(identity, floor) — the max() is done HERE in JS because no engine reliably evaluates math
 * inside filter chains; the pins keep reading the tokens through plain var() (renders everywhere). */
const BLUR_TOKENS: Record<string, number> = {
  "--blur": 10,
  "--blur-sm": 4,
  "--blur-lg": 20,
  "--blur-frosted": 25,
  "--blur-crystal": 2,
};

function applyDiffuse(floor: number) {
  const root = document.documentElement;
  for (const [token, identity] of Object.entries(BLUR_TOKENS)) {
    if (floor > identity) root.style.setProperty(token, `${floor}px`);
    else root.style.removeProperty(token);
  }
}
const OPAQUE_L_KEY = "sistine-glass-opaque-l";
const OUTLINE_KEY = "sistine-glass-opaque-outline";
const OUTLINE_W_KEY = "sistine-glass-opaque-outline-w";
const ACCENT_KEY = "sistine-accent";

/** Opaque-outline weight → the --glass-opaque-outline-w page var (hairline = unset → 1px default).
 * Same ladder as the border axis (glass-border-rim/-frame); an element-level rim/frame beats this. */
const OUTLINE_WEIGHTS = {
  hairline: null,
  rim: "2px",
  frame: "4px",
} as const;
type OutlineWeight = keyof typeof OUTLINE_WEIGHTS;

/** Accent harmony styles → hue offsets from the harmony origin (base hue first), mirroring the CSS --hue-*
 * anchors in app/theme/engine.css. Hues are computed in JS (not read from the CSS vars) so the swatches can
 * preview + apply an accent even before it is switched on. */
const HARMONIES = {
  complement: [
    0,
    180,
  ],
  analogous: [
    0,
    -30,
    30,
  ],
  split: [
    0,
    150,
    210,
  ],
  triad: [
    0,
    120,
    240,
  ],
  tetrad: [
    0,
    60,
    180,
    240,
  ],
  square: [
    0,
    90,
    180,
    270,
  ],
} as const;
type Harmony = keyof typeof HARMONIES;

/**
 * Each preset is just a starting point — hue + chroma (OKLCH) — that the sliders below can then adjust.
 * "Moonstone" is a warm, very-low-chroma off-white you can nudge further with the Chroma slider. "Sistine" is
 * bespoke: it sets data-glass-tint so its four-jewel --glass-bg applies; its border / accent still respond
 * to the sliders via the inline tint vars.
 *
 * IMPORTANT: applyTint() INLINES h/c/a onto <html>, which shadows the [data-glass-tint] CSS block. For the
 * frescoes (sistine/muse/aurora/gloaming) the h/c/a here MUST stay identical to those CSS blocks in
 * app/globals.css (the CSS is the fallback for static, no-switcher consumers) — otherwise the demo and a
 * static page render different fresco surfaces.
 */
const PRESETS = [
  {
    value: "selenite",
    label: "Selenite",
    h: 250,
    c: 0,
    a: 0,
    swatch: "oklch(90% 0 0)",
  },
  {
    value: "sistine",
    label: "Sistine",
    h: 75,
    c: 0.062,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(82% 0.12 75), oklch(80% 0.12 8), oklch(78% 0.12 255), oklch(80% 0.12 158))",
  },
  {
    value: "muse",
    label: "Muse",
    h: 230,
    c: 0.056,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(85% 0.1 222), oklch(78% 0.2 326), oklch(84% 0.12 74))",
  },
  {
    value: "aurora",
    label: "Aurora",
    h: 205,
    c: 0.054,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(76.3% 0.124 235), oklch(74.7% 0.111 205), oklch(71.8% 0.155 155))",
  },
  {
    value: "gloaming",
    label: "Gloaming",
    h: 32,
    c: 0.089,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(84% 0.13 62), oklch(78% 0.15 350), oklch(64% 0.14 278))",
  },
  {
    value: "moonstone",
    label: "Moonstone",
    h: 75,
    c: 0.047,
    a: 0.18,
    swatch: "oklch(94% 0.047 75)",
  },
  {
    value: "amber",
    label: "Amber",
    h: 75,
    c: 0.062,
    a: 0.38,
    swatch: "oklch(85% 0.13 75)",
  },
  {
    value: "rose",
    label: "Rose",
    h: 8,
    c: 0.095,
    a: 0.17,
    swatch: "oklch(82% 0.12 8)",
  },
  {
    value: "goldstone",
    label: "Goldstone",
    h: 22,
    c: 0.094,
    a: 0.17,
    swatch: "oklch(68% 0.15 22)",
  },
  {
    value: "amethyst",
    label: "Amethyst",
    h: 300,
    c: 0.101,
    a: 0.15,
    swatch: "oklch(78% 0.13 300)",
  },
  {
    value: "sapphire",
    label: "Sapphire",
    h: 255,
    c: 0.075,
    a: 0.19,
    swatch: "oklch(78% 0.13 255)",
  },
  {
    value: "lapis",
    label: "Lapis",
    h: 268,
    c: 0.085,
    a: 0.13,
    swatch: "oklch(56% 0.21 268)",
  },
  {
    value: "aventurine",
    label: "Aventurine",
    h: 158,
    c: 0.076,
    a: 0.54,
    swatch: "oklch(80% 0.13 158)",
  },
  {
    value: "carnelian",
    label: "Carnelian",
    h: 38,
    c: 0.081,
    a: 0.19,
    swatch: "oklch(78% 0.14 38)",
  },
  {
    value: "peridot",
    label: "Peridot",
    h: 128,
    c: 0.083,
    a: 0.54,
    swatch: "oklch(86% 0.16 128)",
  },
  {
    value: "turquoise",
    label: "Turquoise",
    h: 190,
    c: 0.057,
    a: 0.54,
    swatch: "oklch(82% 0.1 190)",
  },
  {
    value: "aquamarine",
    label: "Aquamarine",
    h: 215,
    c: 0.053,
    a: 0.5,
    swatch: "oklch(80% 0.11 215)",
  },
  {
    value: "tourmaline",
    label: "Tourmaline",
    h: 342,
    c: 0.106,
    a: 0.18,
    swatch: "oklch(76% 0.16 342)",
  },
] as const;

type PresetValue = (typeof PRESETS)[number]["value"] | "custom";

// Chakra-stone renames (emerald→aventurine, bone→moonstone, neutral→selenite): map a stored legacy
// name to its new preset so returning visitors keep their tint instead of falling back to the default.
const LEGACY_TINTS: Record<string, PresetValue> = {
  emerald: "aventurine",
  bone: "moonstone",
  neutral: "selenite",
};

// Presets that own a bespoke [data-glass-tint] block in globals.css (own --glass-bg / dark overrides) rather
// than just driving the tint vars — so they need the data-glass-tint ATTRIBUTE set to hook those rules: the
// frescoes (Sistine / Muse / Aurora / Gloaming) + moonstone (dark-mode wash/opaque override → pale "dark moonstone").
const BESPOKE = new Set<string>([
  "sistine",
  "muse",
  "aurora",
  "gloaming",
  "moonstone",
]);

/** `a: null` = let CSS own the wash alpha. Named presets now split --glass-tint-a per MODE (a wash near
 *  that mode's floor tolerates far more alpha than one far from it — see presets.css), and an inline value
 *  shadows BOTH blocks, which would collapse the split back to one number. So a preset passes null and the
 *  attribute does the work; only a CUSTOM tint, which has no CSS block to read from, inlines its own. */
function applyTint(h: number, c: number, a: number | null, tint: string | null) {
  const root = document.documentElement;
  if (tint) {
    root.dataset.glassTint = tint;
  } else {
    delete root.dataset.glassTint;
  }
  root.style.setProperty("--glass-tint-h", String(h));
  root.style.setProperty("--glass-tint-c", String(c));
  if (a === null) root.style.removeProperty("--glass-tint-a");
  else root.style.setProperty("--glass-tint-a", String(a));
  // Harmonic anchor: the two hue-less themes — selenite (chroma 0) and moonstone — anchor the color wheel at 0°
  // for a colorful red-based harmony; every other tint lets --harmony-h default to the content hue. Still set
  // HERE rather than via CSS even though named presets now carry a data-glass-tint attribute, because a CUSTOM
  // tint has no attribute and can still be dragged to chroma 0 — keying on CHROMA, the single colorfulness
  // master (surfaces + text + harmonics), covers the preset and the custom path with one rule.
  if (c === 0 || tint === "moonstone") {
    root.style.setProperty("--harmony-h", "0");
  } else {
    root.style.removeProperty("--harmony-h");
  }
  // The re-band nudge now comes from emitFg() in the handlers — it carries a JS snapshot so AutoForeground
  // can skip the getComputedStyle forced reflow — so applyTint no longer dispatches here.
}

/** Optional user accent (hue + vividness). When on, pins --accent-h/--accent-c on <html> so --glass-accent
 *  and AutoForeground's hue-less text (selenite + moonstone) follow the chosen color; off clears them. Fires the
 *  fg event so AutoForeground re-bands (APCA-safe) on change. */
function applyAccent(on: boolean, ah: number, ac: number) {
  const root = document.documentElement;
  if (on) {
    root.style.setProperty("--accent-h", String(ah));
    root.style.setProperty("--accent-c", String(ac));
  } else {
    root.style.removeProperty("--accent-h");
    root.style.removeProperty("--accent-c");
  }
}

// Hand AutoForeground its inputs directly (no DOM read-back) so the hot path — tint / accent / lightness
// drags — skips the getComputedStyle forced reflow. Frescoes resolve --glass-fg-h in CSS per-mode, so JS
// can't snapshot them: send no detail there and let AutoForeground fall back to reading the DOM (rare).
const FRESCOES = new Set([
  "sistine",
  "muse",
  "aurora",
  "gloaming",
]);
function emitFg(v: { h: number; c: number; a: number; base: PresetValue; l: number; accOn: boolean; accH: number; accC: number }) {
  const detail = FRESCOES.has(v.base)
    ? undefined
    : {
        "--glass-fg-h": v.h,
        "--glass-tint-h": v.h,
        "--glass-tint-c": v.c,
        "--glass-tint-a": v.a,
        "--harmony-h": v.c === 0 || v.base === "moonstone" ? 0 : v.h,
        "--glass-opaque-l": v.l,
        "--accent-h": v.accOn ? v.accH : Number.NaN,
        "--accent-c": v.accC,
      };
  window.dispatchEvent(
    new CustomEvent("sistine-fg", {
      detail,
    }),
  );
}

/** Per-mode tint-body lightness override ({light?, dark?}), stored as JSON under OPAQUE_L_KEY. Because
 *  --glass-opaque-l is mode-aware in CSS (88 light / 36.4 dark), L must be tracked separately per mode — a
 *  single global value would wash out the other mode. Old plain-number values parse to a non-object and are
 *  ignored, self-healing to the mode default. */
function readLmap(): {
  light?: number;
  dark?: number;
} {
  try {
    const raw = JSON.parse(localStorage.getItem(OPAQUE_L_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      const out: {
        light?: number;
        dark?: number;
      } = {};
      if (typeof raw.light === "number") out.light = raw.light;
      if (typeof raw.dark === "number") out.dark = raw.dark;
      return out;
    }
  } catch {
    // ignore malformed storage
  }
  return {};
}

/**
 * One unified glass-color control, in OKLCH terms: pick a preset (or dial a custom Hue) and adjust Chroma
 * (OKLCH C — the single "how colorful" master, driving surfaces + text + harmonics). Writes --glass-tint-h/c
 * inline on <html>; the tint alpha rides along from the chosen preset (no longer a knob — "Wash" is retired,
 * chroma 0 is the neutral signal). Sistine additionally toggles its bespoke data-glass-tint preset. Composes
 * with the theme + glass-style switchers.
 */
export function GlassTintSwitcher() {
  const [base, setBase] = React.useState<PresetValue>("amethyst");
  const [h, setH] = React.useState(250);
  const [c, setC] = React.useState(0);
  const [a, setA] = React.useState(0);
  const [opacity, setOpacity] = React.useState(GLASS_OPACITY_DEFAULT);
  const [diffuse, setDiffuse] = React.useState(0);
  const [stainedOn, setStainedOn] = React.useState(false);
  const [lightness, setLightness] = React.useState(90);
  const [outline, setOutline] = React.useState(false);
  const [outlineW, setOutlineW] = React.useState<OutlineWeight>("hairline");
  const [accentOn, setAccentOn] = React.useState(false);
  const [accentH, setAccentH] = React.useState(280);
  const [accentC, setAccentC] = React.useState(0.15);
  // Which harmony style the accent swatch row previews — pure UI state, intentionally not persisted.
  const [harmony, setHarmony] = React.useState<Harmony>("complement");

  React.useEffect(() => {
    const storedRaw = localStorage.getItem(ROOT_KEY);
    const legacy = storedRaw ? LEGACY_TINTS[storedRaw] : undefined;
    if (legacy) {
      try {
        localStorage.setItem(ROOT_KEY, legacy);
      } catch {
        // ignore storage failures
      }
    }
    const storedBase = ((legacy ?? storedRaw) as PresetValue | null) ?? "amethyst";
    const preset = PRESETS.find((p) => p.value === storedBase);
    let nh = preset?.h ?? 250;
    let nc = preset?.c ?? 0.018;
    let na = preset?.a ?? 0;
    let hasCustom = false;
    try {
      const custom = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "null");
      if (custom && typeof custom.h === "number") {
        nh = custom.h;
        nc = custom.c;
        na = custom.a;
        hasCustom = true;
      }
    } catch {
      // ignore malformed storage
    }
    setBase(storedBase);
    setH(nh);
    setC(nc);
    setA(na);
    applyTint(nh, nc, hasCustom || storedBase === "custom" ? na : null, storedBase === "custom" ? null : storedBase);
    /* No stored preference -> do NOT write inline, so the theme's own default (the --glass-opacity
       fallback in @utility glass) stays the single source of truth. Writing it unconditionally is what
       froze the crystal gloss twin earlier; same shape of bug, same fix. */
    const rawO = localStorage.getItem(OPACITY_KEY);
    const no = Number.parseFloat(rawO ?? "");
    const o = rawO !== null && Number.isFinite(no) ? no : GLASS_OPACITY_DEFAULT;
    setOpacity(o);
    if (rawO !== null && Number.isFinite(no)) document.documentElement.style.setProperty("--glass-opacity", String(o));
    else document.documentElement.style.removeProperty("--glass-opacity");
    if (localStorage.getItem(STAINED_KEY) === "1") {
      setStainedOn(true);
      document.documentElement.style.setProperty("--srf-stain", "var(--glass-stain)");
    }
    const nd = Number.parseFloat(localStorage.getItem(DIFFUSE_KEY) ?? "0");
    const df = Number.isFinite(nd) ? nd : 0;
    setDiffuse(df);
    if (df > 0) applyDiffuse(df);
    const storedOutline = localStorage.getItem(OUTLINE_KEY) === "1";
    setOutline(storedOutline);
    if (storedOutline) document.documentElement.style.setProperty("--glass-opaque-outline", "var(--glass-accent)");
    const storedOutlineW = localStorage.getItem(OUTLINE_W_KEY) as OutlineWeight | null;
    if (storedOutlineW && OUTLINE_WEIGHTS[storedOutlineW]) {
      setOutlineW(storedOutlineW);
      document.documentElement.style.setProperty("--glass-opaque-outline-w", OUTLINE_WEIGHTS[storedOutlineW]);
    }
    try {
      const acc = JSON.parse(localStorage.getItem(ACCENT_KEY) ?? "null");
      if (acc && typeof acc === "object") {
        const on = acc.on === true;
        const ah = typeof acc.h === "number" ? acc.h : 280;
        const ac = typeof acc.c === "number" ? acc.c : 0.15;
        setAccentOn(on);
        setAccentH(ah);
        setAccentC(ac);
        applyAccent(on, ah, ac);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  // Tint-body LIGHTNESS is PER-MODE: --glass-opaque-l is mode-aware in CSS (88 light / 36.4 dark), so a single
  // global override would clobber the other mode (dark opaque surfaces would render light). (Re-)apply the
  // current mode's stored L on mount + on every light/dark toggle; with no stored L for a mode, clear the
  // inline override so the CSS default wins. Fires the fg event so AutoForeground re-bands the opaque floor.
  React.useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const mode = root.classList.contains("dark") ? "dark" : "light";
      const stored = readLmap()[mode];
      if (typeof stored === "number") {
        root.style.setProperty("--glass-opaque-l", String(stored));
        setLightness(stored);
      } else {
        root.style.removeProperty("--glass-opaque-l");
        const computed = Number.parseFloat(getComputedStyle(root).getPropertyValue("--glass-opaque-l"));
        setLightness(Number.isFinite(computed) ? computed : mode === "dark" ? 36.4 : 88);
      }
      window.dispatchEvent(new Event("sistine-fg"));
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(root, {
      attributes: true,
      attributeFilter: [
        "class",
      ],
    });
    return () => obs.disconnect();
  }, []);

  const persist = (b: PresetValue, nh: number, nc: number, na: number) => {
    try {
      localStorage.setItem(ROOT_KEY, b);
      localStorage.setItem(
        CUSTOM_KEY,
        JSON.stringify({
          h: nh,
          c: nc,
          a: na,
        }),
      );
    } catch {
      // ignore storage failures
    }
  };

  const choose = (p: (typeof PRESETS)[number]) => {
    setBase(p.value);
    setH(p.h);
    setC(p.c);
    setA(p.a);
    /* Set data-glass-tint for EVERY named preset, not just the bespoke ones. Jewels used to apply as
       inline h/c/a with no attribute, which was fine while a preset was nothing BUT those three numbers.
       It stopped being fine once presets carried their own --glass-wash-l (each hue's chroma ceiling
       peaks at a different lightness): that rule lives behind [data-glass-tint="name"], so without the
       attribute the whole per-hue wash system was inert on this switcher while a static consumer using
       <html data-glass-tint="lapis"> got it. The inline vars still win over the block's own h/c/a, and
       check-theme's [tint-sync] asserts the two agree, so setting the attribute cannot diverge them. */
    applyTint(p.h, p.c, null, p.value);
    persist(p.value, p.h, p.c, p.a);
    // A preset click (not a drag) can change the CSS opaque floor (--glass-opaque-l: moonstone 94.5/84.9) and, for
    // frescoes, --glass-fg-h. Re-sync our lightness state from the DOM and let AutoForeground read the DOM once
    // (one reflow on a click is fine) so the tint is accurate and the NEXT drag's snapshot starts from truth.
    const cs = getComputedStyle(document.documentElement);
    const el = Number.parseFloat(cs.getPropertyValue("--glass-opaque-l"));
    if (Number.isFinite(el)) setLightness(el);
    /* Re-seed alpha from what CSS actually resolved for this mode, so a later drag into "custom" starts
       from the surface you can see rather than from the preset table's light-mode value. */
    const ea = Number.parseFloat(cs.getPropertyValue("--glass-tint-a"));
    if (Number.isFinite(ea)) setA(ea);
    window.dispatchEvent(new Event("sistine-fg"));
  };

  // Dragging a slider keeps a bespoke base (the frescoes) — data-glass-tint stays —
  // but overrides the tint vars; for any other base it becomes a free "custom" color.
  const tweak = (nh: number, nc: number, na: number) => {
    setH(nh);
    setC(nc);
    setA(na);
    const tint = BESPOKE.has(base) ? base : null;
    const next: PresetValue = tint ?? "custom";
    setBase(next);
    applyTint(nh, nc, na, tint);
    persist(next, nh, nc, na);
    emitFg({
      h: nh,
      c: nc,
      a: na,
      base: next,
      l: lightness,
      accOn: accentOn,
      accH: accentH,
      accC: accentC,
    });
  };

  // Global glass solidity — writes --glass-opacity inline on <html> (the floor the glass utilities read),
  // orthogonal to the tint. Composes with every variant + data-glass material.
  // Site-wide stained-glass dye — every translucent surface re-dyes its backdrop to the theme hue
  // (references the engine's --glass-stain token; opaque stays inert). For A/B judging the optic.
  const changeStained = (on: boolean) => {
    setStainedOn(on);
    const root = document.documentElement;
    if (on) root.style.setProperty("--srf-stain", "var(--glass-stain)");
    else root.style.removeProperty("--srf-stain");
    try {
      localStorage.setItem(STAINED_KEY, on ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  };

  // Site-wide diffuse floor — raises every material's blur token to at least this many px.
  const changeDiffuse = (f: number) => {
    setDiffuse(f);
    applyDiffuse(f);
    try {
      localStorage.setItem(DIFFUSE_KEY, String(f));
    } catch {
      // ignore storage failures
    }
  };

  const changeOpacity = (o: number) => {
    setOpacity(o);
    document.documentElement.style.setProperty("--glass-opacity", String(o));
    try {
      localStorage.setItem(OPACITY_KEY, String(o));
    } catch {
      // ignore storage failures
    }
  };

  // Optional accent outline for opaque surfaces — sets --glass-opaque-outline to the theme accent so opaque
  // components gain a colored outline (flair) instead of the flat default border. Applies site-wide.
  // Outline WEIGHT — page-wide width for the same borders the outline toggle colors (opaque material
  // cards + adaptive surfaces on the opaque page style). hairline clears the var (1px default).
  const changeOutlineW = (w: OutlineWeight) => {
    setOutlineW(w);
    const root = document.documentElement;
    const px = OUTLINE_WEIGHTS[w];
    if (px) root.style.setProperty("--glass-opaque-outline-w", px);
    else root.style.removeProperty("--glass-opaque-outline-w");
    try {
      localStorage.setItem(OUTLINE_W_KEY, w);
    } catch {
      // ignore storage failures
    }
  };

  const changeOutline = (on: boolean) => {
    setOutline(on);
    const root = document.documentElement;
    if (on) root.style.setProperty("--glass-opaque-outline", "var(--glass-accent)");
    else root.style.removeProperty("--glass-opaque-outline");
    try {
      localStorage.setItem(OUTLINE_KEY, on ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  };

  // User accent (hue + vividness): persists {on,h,c} + applies via applyAccent — drives --glass-accent and, on
  // selenite + moonstone, the text foreground (AutoForeground re-bands on the sistine-fg event, APCA-safe).
  const changeAccent = (on: boolean, ah: number, ac: number) => {
    setAccentOn(on);
    setAccentH(ah);
    setAccentC(ac);
    applyAccent(on, ah, ac);
    emitFg({
      h,
      c,
      a,
      base,
      l: lightness,
      accOn: on,
      accH: ah,
      accC: ac,
    });
    try {
      localStorage.setItem(
        ACCENT_KEY,
        JSON.stringify({
          on,
          h: ah,
          c: ac,
        }),
      );
    } catch {
      // ignore storage failures
    }
  };

  // Tint-body LIGHTNESS (OKLCH L), PER MODE — writes --glass-opaque-l inline (the opaque floor + opacity fill
  // target + hue-crystal floor read it, and AF bands against it) and stores it under the CURRENT mode so the
  // other mode keeps its own L. LOW L + high Chroma = deep tints (e.g. deep purple).
  const changeLightness = (nl: number) => {
    const root = document.documentElement;
    const mode = root.classList.contains("dark") ? "dark" : "light";
    const map = readLmap();
    map[mode] = nl;
    setLightness(nl);
    root.style.setProperty("--glass-opaque-l", String(nl));
    try {
      localStorage.setItem(OPAQUE_L_KEY, JSON.stringify(map));
    } catch {
      // ignore storage failures
    }
    emitFg({
      h,
      c,
      a,
      base,
      l: nl,
      accOn: accentOn,
      accH: accentH,
      accC: accentC,
    });
  };

  // Harmony origin for the accent swatches — same hue-less rule as applyTint/emitFg: selenite (chroma 0) and
  // moonstone anchor the wheel at 0°; every other tint harmonizes from the current tint hue.
  const harmonyOrigin = c === 0 || base === "moonstone" ? 0 : h;

  const triggerSwatch =
    base === "sistine" || base === "muse"
      ? (PRESETS.find((p) => p.value === base)?.swatch ?? "oklch(90% 0.02 250)")
      : c < 0.005
        ? "oklch(90% 0.02 250)"
        : `oklch(80% ${Math.min(0.15, c * 2).toFixed(3)} ${h})`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" className="h-9 w-9" aria-label="Glass color" title="Glass color">
          <span
            className="size-4 rounded-full border border-[var(--glass-border)]"
            style={{
              background: triggerSwatch,
            }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="font-medium text-sm">Glass color</div>

        <div className="grid grid-cols-4 gap-2">
          {/* Four per row, the 4 frescoes on the top row, then selenite/moonstone + the jewels. */}
          {[
            ...PRESETS.filter((p) => FRESCOES.has(p.value)),
            ...PRESETS.filter((p) => !FRESCOES.has(p.value)),
          ].map((p) => (
            <button
              type="button"
              key={p.value}
              onClick={() => choose(p)}
              title={p.label}
              aria-label={p.label}
              className={cn(
                "size-6 rounded-full border border-[var(--glass-border)] transition-transform active:scale-[0.96]",
                base === p.value ? "ring-2 ring-foreground/60" : "hover:scale-110",
              )}
              style={{
                background: p.swatch,
              }}
            />
          ))}
        </div>

        <SliderRow label="Hue" value={`${Math.round(h)}°`}>
          <Slider
            value={[
              h,
            ]}
            min={0}
            max={360}
            step={1}
            onValueChange={(v) => tweak(v[0] ?? h, c, a)}
          />
        </SliderRow>
        <SliderRow label="Chroma" value={c.toFixed(3)}>
          <Slider
            value={[
              c,
            ]}
            min={0}
            max={0.2}
            step={0.005}
            onValueChange={(v) => tweak(h, v[0] ?? c, a)}
          />
        </SliderRow>
        <SliderRow label="Lightness" value={`${Math.round(lightness)}%`}>
          <Slider
            value={[
              lightness,
            ]}
            min={20}
            max={100}
            step={1}
            onValueChange={(v) => changeLightness(v[0] ?? lightness)}
          />
        </SliderRow>
        <SliderRow label="Opacity" value={opacity.toFixed(2)}>
          <Slider
            value={[
              opacity,
            ]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => changeOpacity(v[0] ?? opacity)}
          />
        </SliderRow>
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>Stained</span>
          <button
            type="button"
            onClick={() => changeStained(!stainedOn)}
            className={cn(
              "rounded-md border px-2 py-0.5 font-medium transition-colors",
              stainedOn ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-foreground/15 hover:text-foreground",
            )}
          >
            {stainedOn ? "dyed" : "off"}
          </button>
        </div>
        <SliderRow label="Diffuse" value={diffuse > 0 ? `${diffuse}px` : "off"}>
          <Slider
            value={[
              diffuse,
            ]}
            min={0}
            max={32}
            step={1}
            onValueChange={(v) => changeDiffuse(v[0] ?? diffuse)}
          />
        </SliderRow>
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>Opaque outline</span>
          <button
            type="button"
            onClick={() => changeOutline(!outline)}
            className={cn(
              "rounded-md border px-2 py-0.5 font-medium transition-colors",
              outline ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-foreground/15 hover:text-foreground",
            )}
          >
            {outline ? "accent" : "off"}
          </button>
        </div>
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>Outline weight</span>
          <div className="flex gap-1">
            {(Object.keys(OUTLINE_WEIGHTS) as OutlineWeight[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => changeOutlineW(w)}
                className={cn(
                  "rounded-md border px-2 py-0.5 font-medium transition-colors",
                  outlineW === w ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-foreground/15 hover:text-foreground",
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-[var(--glass-border)] border-t pt-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="flex items-center gap-1.5">
              Accent
              {accentOn && (
                <span
                  className="size-3 rounded-full border border-[var(--glass-border)]"
                  style={{
                    background: `oklch(0.6 ${accentC} ${accentH})`,
                  }}
                />
              )}
            </span>
            <button
              type="button"
              onClick={() => changeAccent(!accentOn, accentH, accentC)}
              className={cn(
                "rounded-md border px-2 py-0.5 font-medium transition-colors",
                accentOn ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-foreground/15 hover:text-foreground",
              )}
            >
              {accentOn ? "on" : "off"}
            </button>
          </div>
          {/* Harmony picker: pick a style, then click a swatch to APPLY that hue as the accent — same
              changeAccent path as the Accent-hue slider (apply + persist + emitFg), forcing the accent on. */}
          <div className="flex flex-wrap gap-1 text-muted-foreground text-xs">
            {(Object.keys(HARMONIES) as Harmony[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setHarmony(k)}
                className={cn(
                  "rounded-md border px-2 py-0.5 font-medium transition-colors",
                  harmony === k ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-foreground/15 hover:text-foreground",
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {HARMONIES[harmony].map((off) => {
              const hue = (((harmonyOrigin + off) % 360) + 360) % 360;
              return (
                <button
                  key={off}
                  type="button"
                  onClick={() => changeAccent(true, hue, accentC)}
                  title={`${Math.round(hue)}°`}
                  aria-label={`Set accent hue ${Math.round(hue)}°`}
                  className={cn(
                    "size-6 rounded-full border border-[var(--glass-border)] transition-transform active:scale-[0.96]",
                    accentOn && accentH === hue ? "ring-2 ring-foreground/60" : "hover:scale-110",
                  )}
                  style={{
                    background: `oklch(0.62 ${Math.max(accentC, 0.12)} ${hue})`,
                  }}
                />
              );
            })}
          </div>
          {accentOn && (
            <>
              <SliderRow label="Accent hue" value={`${Math.round(accentH)}°`}>
                <Slider
                  value={[
                    accentH,
                  ]}
                  min={0}
                  max={360}
                  step={1}
                  onValueChange={(v) => changeAccent(true, v[0] ?? accentH, accentC)}
                />
              </SliderRow>
              <SliderRow label="Vividness" value={accentC.toFixed(3)}>
                <Slider
                  value={[
                    accentC,
                  ]}
                  min={0}
                  max={0.2}
                  step={0.005}
                  onValueChange={(v) => changeAccent(true, accentH, v[0] ?? accentC)}
                />
              </SliderRow>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SliderRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}
