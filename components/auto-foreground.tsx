"use client";

import * as React from "react";
import {
  formatOklch,
  glassSolidSurface,
  HARMONIC_OFFSETS,
  type HarmonicName,
  harmonicHue,
  pickInBand,
  READABLE_USAGE,
  readableForeground,
  type ThemeForegroundOptions,
  themeForeground,
} from "@/lib/oklch-utils";

const FG_STORAGE_KEY = "sistine-fg";
const RAMP_KEY = "sistine-ramp";
const FG_EVENT = "sistine-fg";

// Dev instrumentation: set localStorage["sistine-fg-debug"] = "1" (then reload) to log each update()'s
// wall-time and how far it nudges --foreground off the CSS baseline (the "marginal bump"). Off by default.
const fgDebug = () => {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("sistine-fg-debug") === "1";
  } catch {
    return false;
  }
};

export type FgPalette = ThemeForegroundOptions["palette"];
export interface FgConfig {
  palette: FgPalette;
  /** Icon foreground hue for `--foreground-ui`: a number (0–360) pins a hue; a harmonic name
   * ("complement" | "triad-1" | "split-2" | … — a color-wheel relationship rotated off --harmony-h,
   * tracked live); null → icons follow the theme/text color. Always contrast-solved (APCA/ARC). */
  iconHue: number | HarmonicName | null;
  /** Heading/large-text hue for `--foreground-soft` — same semantics as iconHue (number pins, a harmonic
   * name rotates off the theme live, null → follow the chosen palette ramp). */
  softHue: number | HarmonicName | null;
  /** Fine/small-text hue for `--foreground-strong` — same semantics (null → follow the palette ramp). */
  strongHue: number | HarmonicName | null;
}
/** The /colors ramp generator's base color + step count, shared with the foreground. */
export interface RampConfig {
  l: number;
  c: number;
  h: number;
  count: number;
}

const FG_PALETTES: FgPalette[] = [
  "tonal",
  "lightness",
  "hue",
  "chroma",
];
const DEFAULT_FG: FgConfig = {
  palette: "lightness", // linear ramp — holds the theme's chroma, so high-contrast text reads as a soft tinted white, not gray
  iconHue: null,
  softHue: null,
  strongHue: null,
};
const DEFAULT_RAMP: RampConfig = {
  l: 60,
  c: 0.15,
  h: 255,
  count: 12, // finest ramp (12 steps/side) — the most cohesive foreground set in practice
};

/** Normalize a stored hue choice: a harmonic relationship name, a pinned number, else null. */
const hueChoice = (v: unknown): number | HarmonicName | null =>
  typeof v === "string" && v in HARMONIC_OFFSETS ? (v as HarmonicName) : typeof v === "number" ? v : null;

/** Read the persisted foreground palette; falls back to the default (Linear). */
export function readFgConfig(): FgConfig {
  try {
    const raw = localStorage.getItem(FG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FgConfig>;
      if (FG_PALETTES.includes(parsed.palette as FgPalette)) {
        return {
          palette: parsed.palette as FgPalette,
          iconHue: hueChoice(parsed.iconHue),
          softHue: hueChoice(parsed.softHue),
          strongHue: hueChoice(parsed.strongHue),
        };
      }
    }
  } catch {
    // ignore parse / storage failures
  }
  return DEFAULT_FG;
}

/** Persist the foreground config + notify AutoForeground to re-apply it site-wide. */
export function writeFgConfig(config: Partial<FgConfig>): void {
  try {
    localStorage.setItem(
      FG_STORAGE_KEY,
      JSON.stringify({
        ...readFgConfig(),
        ...config,
      }),
    );
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new Event(FG_EVENT));
}

/** Read the ramp generator's base color + count (shared from the /colors ramp card). */
export function readRampConfig(): RampConfig {
  try {
    const raw = localStorage.getItem(RAMP_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<RampConfig>;
      if (
        [
          p.l,
          p.c,
          p.h,
          p.count,
        ].every((n) => typeof n === "number")
      ) {
        return {
          l: p.l as number,
          c: p.c as number,
          h: p.h as number,
          count: p.count as number,
        };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_RAMP;
}

/** Persist the ramp base color + count + notify AutoForeground (called by the ramp generator). */
export function writeRampConfig(config: RampConfig): void {
  try {
    localStorage.setItem(RAMP_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(FG_EVENT));
}

export interface AutoForegroundProps {
  /** Foreground ramp palette. Overrides the persisted config when set. */
  palette?: FgPalette;
  /** Ramp base color + step count. Overrides the persisted ramp when set. */
  ramp?: RampConfig;
}

/**
 * Sets the foreground tokens on <html> by drawing COLORS from the chosen OKLCH ramp (palette + base
 * color + step count): `--foreground`, `--muted-foreground`, and the ARC-Bronze size tiers
 * `--foreground-soft` (large) / `--foreground-strong` (fine), plus the icon foreground `--foreground-ui`
 * (ui band, optional hue). Each is picked from that ramp to hit its contrast target on the glass-SOLID
 * surface text sits on — so foregrounds are real theme colors, not neutral gray, and track light/dark +
 * tint automatically. globals.css carries static fallbacks (no flash); the tiers are exposed as the
 * `text-foreground-soft` / `-strong` / `-ui` utilities.
 *
 * Configure declaratively — `<AutoForeground palette="tonal" ramp={{ l, c, h, count }} />` — or, with no
 * props, it reads a persisted config (`writeRampConfig`, e.g. the /colors generator) and re-applies on the
 * `sistine-fg` event. Mount it once at the app root. The foreground level is contrast-target-driven
 * (the ARC-Bronze band per tier), not a manual ramp index.
 */
export function AutoForeground({ palette: paletteProp, ramp: rampProp }: AutoForegroundProps = {}) {
  const rl = rampProp?.l;
  const rc = rampProp?.c;
  const rh = rampProp?.h;
  const rcount = rampProp?.count;

  React.useEffect(() => {
    const root = document.documentElement;

    const update = (inputs?: Record<string, number>) => {
      const dbg = fgDebug();
      const t0 = dbg ? performance.now() : 0;
      const dark = root.classList.contains("dark");
      const storedFg = readFgConfig();
      const storedRamp = readRampConfig();
      const palette = paletteProp ?? storedFg.palette;
      const count = rcount ?? storedRamp.count;
      // A snapshot from the switcher (the drag hot path) lets us skip getComputedStyle — the read-after-write
      // forced reflow measured at 7–22ms. Fall back to the DOM for mount / mode toggle / frescoes (no snapshot).
      const cs = inputs ? null : getComputedStyle(root);
      const fgBefore = dbg ? (cs ? cs.getPropertyValue("--foreground").trim() : root.style.getPropertyValue("--foreground").trim()) : "";
      const num = (name: string, fb: number) => {
        const v = inputs ? inputs[name] : cs ? Number.parseFloat(cs.getPropertyValue(name)) : Number.NaN;
        return v == null || Number.isNaN(v) ? fb : v;
      };
      // Foregrounds FOLLOW THE CHOSEN FOREGROUND HUE: the ramp's hue is --glass-fg-h (which defaults to
      // the glass tint --glass-tint-h, but frescoes set it apart so text anchors off their surface).
      // Lightness + chroma (vividness) and step count come from the /colors ramp config. Picks are
      // measured on the glass-SOLID surface body text sits on — a known surface, so a real Lc.
      const tintH = num("--glass-fg-h", num("--glass-tint-h", rh ?? storedRamp.h));
      const tintA = num("--glass-tint-a", 0);
      // Colorfulness gate — CHROMA is the single master now that Wash is retired: tint-c > 0 → colored
      // foregrounds (at the ramp's vividness) + hue-tracking harmonics; chroma 0 → achromatic. (tintA still
      // feeds the glass-solid SURFACE color below, but no longer decides "is this theme colored?".)
      const tintC = num("--glass-tint-c", 0);
      // Harmony anchor — the wheel origin the icon/foreground harmonics rotate from. Mirrors the CSS
      // --harmony-h (content hue, or 0 for the hue-less selenite/moonstone themes set inline by the tint switcher);
      // falls back to the content hue when unset (jewels), so JS harmonics land on the SAME angle as the
      // --hue-* swatches. harmonicHue(fgHarmonyH, name) below matches calc(var(--harmony-h) + N) exactly.
      const harmonyH = num("--harmony-h", tintH);
      const cfgC = rc ?? storedRamp.c;
      // User accent: on the hue-LESS themes only (selenite + moonstone anchor --harmony-h at 0), a chosen accent
      // colors ALL text tiers — its hue + vividness drive the ramp base, so foregrounds tint toward the accent
      // instead of gray (selenite) / warm-moonstone. Frescoes (--harmony-h != 0) are untouched. Band-picking below
      // still hits each tier's ARC-Bronze APCA target, so accent-tinted text stays legible.
      const accentH = num("--accent-h", Number.NaN);
      const accentC = num("--accent-c", 0.15);
      // Uncertainty-aware contrast margin. The normal tiers are banded against the veiled floor MODEL,
      // whose only unknown is the backdrop showing through — and the backdrop's weight in that mix is
      // exactly (1 − solidA)·(1 − tintA) (see glassSolidSurface). The more the backdrop shows, the less
      // the model can be trusted, so each band's TARGET gets a safety margin of up to +LC_MARGIN
      // (≈ one ARC band step) at fully-sheer, decaying to +0 at a fully-known floor (solidA 1 — e.g. the
      // opaque page style sets --glass-solid-a: 1). Ceilings still cap the pick (anti-harshness).
      const LC_MARGIN = 12;
      // Parity aim for a FULLY-KNOWN floor. LC_MARGIN above is an UNCERTAINTY margin — it decays to 0 as the
      // floor becomes exactly modelable, which is right on its own terms but leaves the one surface we model
      // exactly (opaque) aiming at the BARE band target while every other surface aims 3.6–5.7 Lc above it.
      // Measured at the shipped defaults that made opaque the lowest-contrast surface in the system for every
      // tint in BOTH modes (body 80.0 vs 82.0–87.3, muted 72.0 vs 73.0–79.3) — the "soft / out-of-focus"
      // opaque card. Certainty about the floor is no reason to aim at the minimum, so a known floor gets this
      // baseline aim instead. Sized to the MIDDLE of the other surfaces' effective margins so opaque lands
      // LEVEL with them; the full LC_MARGIN here would pin body+muted to the band ceiling and just invert the
      // asymmetry (opaque becomes the harshest surface). Ceilings still cap the pick.
      const LC_AIM_KNOWN = 4;
      const solidA = num("--glass-solid-a", 0.65);
      // Wash knobs — moonstone is the ONE preset that overrides them at night (--glass-wash-l: 72%,
      // --glass-wash-c-mult: 2 — its pale-cream character), which the hardcoded model missed and
      // every moonstone-night surface banded ~3 L too dark (bright page, faint text). num() reads the
      // truth on the computed path; snapshots can't carry these, so the FALLBACK is moonstone-aware via
      // the data-glass-tint attribute (cheap, race-free on both paths). Every other theme resolves
      // to the standard mode values either way — this is a moonstone-only correction by construction.
      // check-theme [moonstone-sync] keeps these mirrored constants equal to presets.css.
      const moonstone = root.dataset.glassTint === "moonstone";
      const washL = num("--glass-wash-l", moonstone && dark ? 64 : dark ? 58 : 72);
      const washCMult = num("--glass-wash-c-mult", moonstone && dark ? 2 : 2.5);
      const showThrough = Math.min(Math.max((1 - solidA) * (1 - tintA), 0), 1);
      const normalLcBoost = LC_MARGIN * showThrough;
      const huelessAccent = harmonyH === 0 && !Number.isNaN(accentH);
      // The wheel origin harmonics rotate from — the accent on hue-less+accent, else the CSS --harmony-h.
      const fgHarmonyH = huelessAccent ? accentH : harmonyH;
      // A neutral tint → ACHROMATIC foregrounds (black/white/gray by lightness). EXCEPTION: the Hue palette
      // stays a full-spectrum color wheel even when neutral. A hue-less accent overrides both — it hue +
      // vividnesses the whole ramp so every text tier tints toward the chosen accent.
      const base = {
        l: rl ?? storedRamp.l,
        c: huelessAccent ? accentC || cfgC : palette === "hue" ? cfgC || 0.15 : tintC > 0 ? cfgC : 0,
        h: huelessAccent ? accentH : tintH,
      };
      // Draw every foreground from the chosen tonal/lightness ramp — real theme COLORS, not neutral
      // gray — each picked to hit its ARC-Bronze contrast target on the surface text actually sits on.
      const ramp = Array.from(
        {
          length: count + 1,
        },
        (_, level) =>
          themeForeground({
            palette,
            level,
            count,
            base,
            dark,
          }),
      );
      const iconHue = storedFg.iconHue;
      // Set the full foreground tier set against a given SURFACE, under a var suffix. Run twice: "" for the
      // normal glass-SOLID surface (page + translucent/solid cards), and "-opaque" for the solid
      // --glass-opaque-bg floor. The opaque re-skin in globals.css remaps --foreground* → the -opaque vars
      // inside opaque cards, so a LIGHT opaque floor (e.g. dark-mode moonstone cream) gets DARK card text while
      // the dark page keeps light text — one global foreground can't do both, so opaque cards get their own.
      const applyTiers = (
        surface: {
          l: number;
          c: number;
          h: number;
        },
        suffix: string,
        adaptive: boolean,
        lcBoost = 0,
        // Baseline aim, kept SEPARATE from lcBoost so the two stay honest: lcBoost answers "how much don't
        // we know about this floor", lcAim answers "how far above the bare minimum should we aim on a floor
        // we DO know". Only the opaque set passes it (see LC_AIM_KNOWN); every other surface earns its
        // margin from uncertainty and leaves this 0.
        lcAim = 0,
      ) => {
        // Lift the band's TARGET toward its ceiling by the uncertainty boost + the baseline aim. Floors and
        // ceilings stay — the margin aims higher, it never legalizes a harsher pick than the band allowed.
        const boost = (band: { floor: number; target: number; ceiling: number }) => ({
          ...band,
          target: Math.min(band.target + lcBoost + lcAim, band.ceiling),
        });
        // Band-aware pick: honor each tier's floor (minimum) + ceiling (anti-spike), aiming for target. Normal
        // surfaces draw a COLORED pick from the theme ramp; `adaptive` (opaque floors) uses readableForeground
        // instead, which flips the lightness DIRECTION to whatever the floor needs — the ramp only spans the
        // readable half (white→base in dark mode), so it can't produce DARK text for a light floor (moonstone cream).
        const tier = (rawBand: { floor: number; target: number; ceiling: number }) => {
          const band = boost(rawBand);
          return formatOklch(
            adaptive
              ? readableForeground(surface, {
                  floor: band.floor,
                  target: band.target,
                  ceiling: band.ceiling,
                  // Opaque cards on the hue-less themes (selenite + moonstone) follow the chosen accent too — same as
                  // the normal surface above — so moonstone/selenite opaque-card text tints toward the accent.
                  hue: huelessAccent ? accentH : tintH,
                  chroma: huelessAccent ? accentC : tintC > 0 ? cfgC : 0,
                  // Accent path ONLY: keep the accent VISIBLE on floors whose max contrast sits below the
                  // band (moonstone-dark cream L80 tops out at Lc ≈ 68 < body floor 75) — without this the solve
                  // pins to L≈0, the gamut collapses chroma, and accent text renders BLACK. Every other
                  // theme passes 0 → behavior unchanged.
                  minChroma: huelessAccent ? 0.08 : 0,
                })
              : pickInBand(ramp, surface, band),
          );
        };
        root.style.setProperty(`--foreground${suffix}`, tier(READABLE_USAGE.body));
        root.style.setProperty(
          `--muted-foreground${suffix}`,
          tier({
            // Raised from 45/60/75 → muted lands darker (≈L30 on a light opaque floor) — a firmer secondary,
            // not a faint one. Global + computed per-hue (moonstone, sistine, every jewel), both surfaces + opaque.
            floor: 60,
            target: 72,
            ceiling: 84,
          }),
        );
        // Size tiers default to a palette-ramp pick (tier). softHue/strongHue (mirroring iconHue) optionally
        // pin a tier to its OWN readable hue — a number, "complement" (theme's opposite, live), or null =
        // follow the palette — so headings / fine text can be tinted independently of body text.
        const tierAtHue = (usage: "large" | "small", choice: number | HarmonicName | null) =>
          choice == null
            ? tier(READABLE_USAGE[usage])
            : formatOklch(
                readableForeground(surface, {
                  ...boost(READABLE_USAGE[usage]),
                  hue: typeof choice === "string" ? harmonicHue(fgHarmonyH, choice) : choice,
                  chroma: 0.15,
                }),
              );
        root.style.setProperty(`--foreground-soft${suffix}`, tierAtHue("large", storedFg.softHue));
        // REACH-LIMITED IN LIGHT MODE, by design of the surfaces themselves: the small band floors at Lc 90,
        // and a mid-light floor simply cannot deliver that much even with pure black text. Light opaque (L90)
        // tops out at 82.6–87.6 across the tints and light chakra (L88) at 82.0–83.7, so --foreground-strong
        // on those two surfaces lands 2.4–8.0 Lc under its floor. readableForeground's documented
        // reach < floor fallback covers it — it returns the MOST contrast available rather than failing —
        // and no margin can close the gap. Only raising --glass-opaque-l past ~94.5 / --glass-chakra-l past
        // ~92.5 would (measurably paler cards); that is a design call, not a banding bug. Dark mode has
        // headroom to spare (reach 96–104) and hits the floor everywhere.
        root.style.setProperty(`--foreground-strong${suffix}`, tierAtHue("small", storedFg.strongHue));
        // Icons get their own foreground: a ui-band-legible color (lightness solved for contrast) at an
        // OPTIONAL chosen hue — so icons can be tinted/cycled while staying readable, independent of the
        // text palette. iconHue null → follow the theme (neutral → gray, tinted → the tint hue).
        const iconH = typeof iconHue === "string" ? harmonicHue(fgHarmonyH, iconHue) : typeof iconHue === "number" ? iconHue : tintH;
        root.style.setProperty(
          `--foreground-ui${suffix}`,
          formatOklch(
            readableForeground(surface, {
              ...boost(READABLE_USAGE.ui),
              hue: iconH,
              chroma: iconHue != null ? 0.15 : tintC > 0 ? cfgC : 0,
            }),
          ),
        );
      };

      // Normal surface: the veiled floor body text sits on (page + translucent/veiled cards), with the
      // show-through margin lifting each band target as the floor gets sheerer.
      applyTiers(
        glassSolidSurface(
          dark,
          {
            h: tintH,
            c: num("--glass-tint-c", 0),
            a: tintA,
          },
          solidA,
          washL,
          washCMult,
        ),
        "",
        false,
        normalLcBoost,
      );
      // Opaque cards paint the solid --glass-opaque-bg floor — band a second set against it (its lightness
      // is exposed as the numeric --glass-opaque-l token; chroma/hue from the tint). `adaptive` so a LIGHT
      // floor (moonstone cream) gets DARK text — the theme ramp only spans the readable half and can't.
      applyTiers(
        {
          l: num("--glass-opaque-l", dark ? 32 : 90),
          c: num("--glass-tint-c", 0) * 0.9,
          h: tintH,
        },
        "-opaque",
        true,
        0, // no uncertainty — --glass-opaque-l models this floor exactly
        LC_AIM_KNOWN,
      );
      // Crystal cards: the specular gloss is baked UNDER content, so title-zone text sits on a locally
      // LIGHTENED surface — worst in dark mode, where the ~L94 highlight over a dark floor pulls the
      // local surface toward mid-gray. Band a THIRD set against the crystal surface + the title zone's
      // MEAN gloss term (the top highlight peaks at 0.4α and fades out by 30% height → ≈0.2 effective;
      // modeling the 0.4 peak would make the band unsatisfiable on mid-gray). [data-material="crystal"]
      // and the crystal page style remap the tiers to this set — except veiled crystal, whose floor is
      // what the NORMAL tiers are banded for. Same show-through margin logic: the backdrop's weight in
      // this mix is (1−crysA)(1−tintA)(1−glossA).
      {
        const crysA = num("--glass-crystal-bg-a", dark ? 0.1 : 0.3);
        /* Mode-aware fallback: --glass-gloss-l is a twin now (97 light / 66 dark), so a single 66 here
           would model the light crystal surface ~6 L darker than it renders and band text too weak. */
        const glossL = num("--glass-gloss-l", dark ? 66 : 97);
        const GLOSS_TOP_A = 0.2; // mean of the 0.4α top highlight across the title zone
        const baseL = dark ? 20 : 95;
        const floorL = baseL * (1 - crysA) + 100 * crysA;
        const washedL = floorL * (1 - tintA) + washL * tintA;
        const crystalL = washedL * (1 - GLOSS_TOP_A) + glossL * GLOSS_TOP_A;
        const uCrystal = Math.min(Math.max((1 - crysA) * (1 - tintA) * (1 - GLOSS_TOP_A), 0), 1);
        applyTiers(
          {
            l: crystalL,
            c: num("--glass-tint-c", 0) * 0.6,
            h: tintH,
          },
          "-crystal",
          true,
          LC_MARGIN * uCrystal,
        );
      }
      // Chakra cards: content sits on the translucent body, so --glass-chakra-l IS the banding
      // lightness. The facet bands need no term — they live in box-shadow, ride the outer few px of the
      // edge, and pair a highlight against an ink on opposite sides, so they contribute nothing where
      // text actually sits. Show-through is just (1 − body a), the largest of any tier here, so this
      // gets the full margin. `adaptive` for the same reason opaque is: an L88 body can sit on a dark
      // page, and the theme ramp only spans the readable half so it cannot produce dark text.
      {
        const bodyA = num("--glass-chakra-a", dark ? 0.58 : 0.62);
        const uChakra = Math.min(Math.max((1 - bodyA) * (1 - tintA), 0), 1);
        applyTiers(
          {
            l: num("--glass-chakra-l", dark ? 28 : 88),
            c: Math.min(num("--glass-tint-c", 0), num("--glass-chakra-c-max", dark ? 0.046 : 0.055)),
            h: tintH,
          },
          "-chakra",
          true,
          LC_MARGIN * uChakra,
        );
      }
      if (dbg) {
        const dur = performance.now() - t0;
        // Wall-time = the getComputedStyle forced recalc + the JS solve (58 µs). The post-write recalc from
        // the setProperty calls shows separately as "Recalculate Style" in the Performance panel.
        console.debug(
          `[AutoForeground] update ${dur.toFixed(2)}ms · --foreground ${fgBefore || "(unset)"} → ${root.style.getPropertyValue("--foreground")}`,
        );
        try {
          performance.measure("AutoForeground.update", {
            start: t0,
            duration: dur,
          });
        } catch {
          // options form of performance.measure not supported
        }
      }
    };

    update();
    // Mode toggle (class) uses the DOM-read fallback — the one place we still pay the recalc, by design.
    // Tint / accent / lightness changes arrive via FG_EVENT carrying a JS snapshot (no getComputedStyle).
    // Inline STYLE mutations re-band ONLY when a surface-model input actually changed: --glass-solid-a
    // (the veil-floor slider) or --glass-gloss-l (the crystal gloss-boldness slider) — the two inputs
    // with no FG_EVENT. The old-vs-new gate keeps tint drags on the event fast path AND breaks the
    // self-trigger loop from our own --foreground* writes (which touch neither).
    const STYLE_INPUTS = [
      /--glass-solid-a:\s*([^;]+)/,
      /--glass-gloss-l:\s*([^;]+)/,
    ];
    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.attributeName === "class") {
          update();
          return;
        }
        if (m.attributeName === "style") {
          const now = root.getAttribute("style") ?? "";
          const was = m.oldValue ?? "";
          if (STYLE_INPUTS.some((re) => re.exec(was)?.[1]?.trim() !== re.exec(now)?.[1]?.trim())) {
            update();
            return;
          }
        }
      }
    });
    observer.observe(root, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        "class",
        "style",
      ],
    });
    const onFg = (e: Event) => update((e as CustomEvent<Record<string, number>>).detail ?? undefined);
    window.addEventListener(FG_EVENT, onFg);
    return () => {
      observer.disconnect();
      window.removeEventListener(FG_EVENT, onFg);
    };
  }, [
    paletteProp,
    rl,
    rc,
    rh,
    rcount,
  ]);

  return null;
}
