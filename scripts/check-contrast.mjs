#!/usr/bin/env node
/**
 * Contrast guard for the tint presets.
 *
 * Every per-preset number the theme ships — --glass-wash-l, the per-MODE --glass-tint-a, --glass-tint-c,
 * --glass-opaque-l / -c-scale / -c-max — was chosen against ONE budget: body text has to keep |Lc| >= 75
 * (the ARC-Bronze body floor, READABLE_USAGE.body.floor) on the surface it actually lands on. Nothing
 * enforced that budget. check-gamut guards chroma against the sRGB ceiling, apca-oracle guards the APCA
 * port against the reference, and the surface-parity test guards AutoForeground's jsdom FALLBACKS — none
 * of them reads a preset.
 *
 * The gap matters because the budget is not monotonic and not intuitive:
 *   - Alpha slides the surface from the material floor toward the wash. A wash near that mode's floor
 *     barely moves it; a wash far away drags it through the mid-tone band where NO text polarity reaches
 *     the floor. That is why alpha is mode-split — lapis takes 0.54 in dark and 0.17 in light.
 *   - Contrast RECOVERS past the dead zone, so "scan up until it passes" finds a value on the far side of
 *     a valley the surface cannot cross. The ceiling is the FIRST failure, not the last pass.
 * Both make it easy to nudge a value and silently strand a preset. This asserts the budget directly.
 *
 * What this asserts, per preset x mode:
 *   1. [body]  the body tier reaches >= BODY_FLOOR Lc on the normal (wash + solidify) surface.
 *   2. [margin] it does so with at least MARGIN Lc of slack, so a preset cannot sit exactly on the line
 *               where a rounding change tips it under.
 *   3. [ink]   the ink border (borderColor="ink": --foreground at --glass-border-ink-a over the surface)
 *               clears INK_FLOOR Lc, APCA's floor for non-text elements a user must see, on both the sheer
 *               surface and the opaque card. It exists because the material's own edge does not.
 *
 * It models the surface the way components/auto-foreground.tsx does — glassSolidSurface() with the
 * solidify floor, then readableForeground() for the body band — so a change to that model shows up here
 * rather than only in production.
 *
 * Run: bun run test:contrast   (needs Node >= 22 to type-strip the imported .ts)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  apcaContrast,
  boostBand,
  compositeSurface,
  limitingSurface,
  parseGradientStops,
  foregroundRamp,
  glassSolidSurface,
  LC_AIM_KNOWN,
  LC_MARGIN,
  pickTonalInBand,
  READABLE_USAGE,
  readableTonal,
  showThrough,
  TONAL_MAX_L,
  TONAL_MIN_L,
} from "../lib/oklch-utils.ts";

/* The /colors ramp defaults AutoForeground solves at. The clip bounds, margins, ramp build and pick all
   come from lib/oklch-utils now — this file used to re-declare them and had drifted. */
const RAMP_COUNT = 12;
const RAMP_CHROMA = 0.15;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const BODY_FLOOR = READABLE_USAGE.body.floor; // 75 — read from the source of truth, never hardcoded
const MARGIN = 1.5; // Lc of slack required on top of the floor
/* APCA's level for non-text elements that must be perceived (outlines, focus rings, dividers that carry
   meaning). Well under any text floor, deliberately: a border is a shape, not glyphs. */
const INK_FLOOR = 30;

/**
 * Known, DESIGN-level exceptions: pinned at their measured value so they cannot silently get worse, and
 * so a new failure still fails. Not a way to wave things through — each entry needs a reason a tuning
 * change cannot fix.
 *
 * moonstone (dark) — the one preset whose opaque floor is LIGHT while its page is dark (cream L84.9 on
 * an L20 page, deliberately: "pale silvery stone", see presets.css). The solidify layer composites that
 * floor at --glass-opacity over the dark veil floor — 0.3 x 18.7 + 0.7 x 84.9 = 65 — which is mid-tone,
 * where no text polarity reaches the body floor. Searched exhaustively over opacity x alpha x wash-L x
 * opaque-L: nothing inside moonstone's own character clears 76.5. The only passing configuration
 * (opacity 1, wash L88, opaque L92) turns moonstone night into a near-white card, which is a different
 * preset. Fixing it properly means choosing between solid-cream cards or sheer-dark ones — a design
 * call, not a number. Until then this is pinned.
 */
const KNOWN = new Map([]);

const css = {
  tokens: read("app/theme/tokens.css"),
  presets: read("app/theme/presets.css"),
  frescoes: read("app/theme/frescoes.css"),
  engine: read("app/theme/engine.css"),
};

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** Mode knobs from tokens.css's :root / .dark. */
function modeVars() {
  const t = strip(css.tokens);
  const rootBody = t.slice(t.indexOf(":root {"), t.indexOf(".dark {"));
  const darkBody = t.slice(t.indexOf(".dark {"));
  const grab = (b) => {
    const m = new Map();
    for (const [, k, v] of b.matchAll(/--([a-z0-9-]+):\s*([\d.]+)%?\s*;/g)) m.set(k, +v);
    return m;
  };
  return { light: grab(rootBody), dark: grab(darkBody) };
}

/** Every [data-glass-tint] block's declared numbers, split by mode scope. */
function presets() {
  const out = new Map();
  for (const src of [css.presets, css.frescoes]) {
    for (const [, darkSel, name, body] of strip(src).matchAll(/(\.dark)?\[data-glass-tint="([a-z]+)"\][^{]*\{([^}]*)\}/g)) {
      const rec = out.get(name) ?? { name, light: new Map(), dark: new Map(), fresco: { light: "", dark: "" } };
      const target = darkSel ? rec.dark : rec.light;
      for (const [, k, v] of body.matchAll(/--([a-z0-9-]+):\s*([\d.]+)%?\s*;/g)) target.set(k, +v);
      /* A fresco points --glass-crystal-fresco at its own --glass-bg sheet, per mode: keep that gradient's
         text so its stops can be scored (limitingSurface). */
      if (/--glass-crystal-fresco:\s*var\(--glass-bg\)/.test(body)) {
        rec.fresco[darkSel ? "dark" : "light"] = /--glass-bg:\s*(linear-gradient\([\s\S]*?\));/.exec(body)?.[1] ?? "";
      }
      out.set(name, rec);
    }
  }
  return [...out.values()];
}

/** Resolve a token for a preset in a mode: its own dark block > its light block > the mode knob. */
const resolve = (p, mode, vars, key, fallback) => (mode === "dark" ? p.dark.get(key) : undefined) ?? p.light.get(key) ?? vars[mode].get(key) ?? fallback;

const vars = modeVars();
const all = presets();
const failures = [];
const report = [];
const inkReport = [];

for (const p of all) {
  for (const mode of ["light", "dark"]) {
    const dark = mode === "dark";
    const h = resolve(p, mode, vars, "glass-tint-h");
    const c = resolve(p, mode, vars, "glass-tint-c");
    const a = resolve(p, mode, vars, "glass-tint-a");
    if (h === undefined || c === undefined || a === undefined) continue; // an incomplete scrape, not a preset

    const washL = resolve(p, mode, vars, "glass-wash-l", dark ? 58 : 72);
    const washCMult = resolve(p, mode, vars, "glass-wash-c-mult", 2.5);
    const opaqueL = resolve(p, mode, vars, "glass-opaque-l", dark ? 33.4 : 93);
    const cScale = resolve(p, mode, vars, "glass-opaque-c-scale", dark ? 0.98 : 0.85);
    /* A preset's --glass-opaque-c-max is its ceiling at the LIGHT floor; in dark, tokens.css's
       `.dark[data-glass-tint]` guard outranks it, so only a preset's own dark block can pin it there. */
    const cMax = dark
      ? (p.dark.get("glass-opaque-c-max") ?? vars.dark.get("glass-opaque-c-max") ?? 0.12)
      : resolve(p, mode, vars, "glass-opaque-c-max", 0.055);
    const solidA = vars[mode].get("glass-solid-a") ?? 0.65;

    /* The backing under sheer glass is --glass-solidify-*, its own surface since the split (tokens.css)
       — NOT --glass-opaque-*, which is what an opaque CARD paints. Light lifts it to 92 with a derived
       cap; dark pins both back to the opaque floor, so this resolves identically there. */
    const solidifyL = resolve(p, mode, vars, "glass-solidify-l", dark ? 36.4 : 92);
    const solidifyCMax = resolve(p, mode, vars, "glass-solidify-c-max", dark ? cMax : cMax * 0.65);

    /* The same composition components/auto-foreground.tsx models: the veil/solid floor, the solidify
       layer (--glass-opacity, 0.7 fallback) over it, then the tint wash on top. */
    const surface = glassSolidSurface(dark, { h, c, a }, solidA, washL, washCMult, {
      l: solidifyL,
      c: Math.min(c * cScale, solidifyCMax),
      a: 0.7,
    });
    /* Measure THE TOKEN THAT SHIPS, not a parallel solve. The normal surface does NOT use
       readableForeground — that is the `adaptive` path, for the opaque/crystal/chakra floors. Body text on
       the page draws from the discrete tonal RAMP via pickInBand, whose darkest surviving step is L20.
       The two disagree exactly where it matters: readableForeground solves a continuous lightness and can
       always find one that clears the floor, while the ramp either has a step that clears it or does not.
       Measured on this tree, four presets sat at 74.9 Lc on the L20 step — just under
       AutoForeground's legibility guard, which then discards the tonal ramp and hands back the raw
       ramp's extreme, i.e. #000000. This guard reported all four green at 76.5 Lc throughout, because the
       continuous solve found a near-black it could reach. Modelling the ramp is what makes "the floor
       holds" mean "the emitted colour holds". */
    const ramp = foregroundRamp({ palette: "lightness", count: RAMP_COUNT, base: { l: 60, c: RAMP_CHROMA, h: surface.h }, dark });
    const band = boostBand(READABLE_USAGE.body, LC_MARGIN * showThrough(solidA, a, 0.7));
    /* A fresco paints its multi-hue sheet over every material: score text at the hardest stop of it, the
       surface AutoForeground now solves against too, rather than at the plain surface it used to assume. */
    const stops = parseGradientStops(dark ? p.fresco?.dark || p.fresco?.light || "" : p.fresco?.light || "");
    const textSurface = limitingSurface(surface, stops);
    const fg = pickTonalInBand(ramp, textSurface, band);
    /* Two readings under a fresco: the FLOOR has to hold at the hardest stop (worstLc), and the rounding
       MARGIN is judged on the modelled surface as it always was (lc). A stop is the extreme corner of
       the sweep, not the surface a paragraph mostly sits on; holding it to the floor is the guarantee,
       holding it to floor + margin would demand slack the plain surface already has. Without a fresco
       the two are the same number. */
    const lc = Math.abs(apcaContrast(fg, surface));
    const worstLc = Math.abs(apcaContrast(fg, textSurface));
    report.push({ name: p.name, mode, lc, washL, a });

    /* THE OPAQUE TIER, which this guard did not cover at all — and which was silently shipping #000000
       on every jewel in light. That surface is solved by readableForeground, not the ramp, and it aims
       at target + LC_AIM_KNOWN; an L88 floor tops out at 81.1–84.3 Lc, so the aim is unreachable and the
       solve pins to the lightness extreme where the gamut annihilates chroma. AutoForeground clips it to
       the same TONAL bounds as the ramp; assert the clip held, i.e. that the emitted ink still carries
       the theme's colour rather than having collapsed to black or white. Neutral scopes are exempt for
       the same reason the ramp clip exempts them: there the extremes are genuine ends of a grey scale. */
    /* The opaque card is its floor plus the tint wash (the glass stack at full opacity), and the floor's
       cap is the preset cap times --glass-opaque-cap-scale (0.55 light, where the floor sits at L93). */
    const capScale = vars[mode].get("glass-opaque-cap-scale") ?? (dark ? 1 : 0.55);
    const opaqueSurface = compositeSurface({ l: opaqueL, c: Math.min(c * cScale, cMax * capScale), h }, [{ l: washL, c: c * washCMult, h, a }]);
    const opaqueBand = boostBand(READABLE_USAGE.body, 0, LC_AIM_KNOWN);
    const opaqueText = limitingSurface(opaqueSurface, stops);
    const opaqueInk = readableTonal(opaqueText, opaqueBand, { hue: opaqueSurface.h, chroma: RAMP_CHROMA });
    const opaqueLc = Math.abs(apcaContrast(opaqueInk, opaqueText));
    /* Assert LIGHTNESS, not chroma. At L≈0 the shared gamut test is eps-tolerant and reports PHANTOM
       chroma — #000000 comes back carrying c 0.067 at the warm hues — so a chroma assertion silently
       passes the exact colour it is meant to catch (lib/oklch-utils documents this inside
       readableForeground's minChroma branch, which rejects it with a tighter eps). The clip bounds are
       the honest test: inside them the colour renders tinted, outside it does not. */
    if (c > 0 && (opaqueInk.l < TONAL_MIN_L || opaqueInk.l > TONAL_MAX_L)) {
      failures.push(
        `[opaque] ${p.name} (${mode}) — --foreground-opaque solved to L${opaqueInk.l.toFixed(1)}, past the tonal clip ` +
          `(${TONAL_MIN_L}–${TONAL_MAX_L}), on an L${opaqueL} floor whose reach is ${opaqueLc.toFixed(1)} Lc. ` +
          `That is the achromatic extreme — the clip should have caught it.`,
      );
    } else if (opaqueLc < BODY_FLOOR) {
      failures.push(
        `[opaque] ${p.name} (${mode}) — opaque-card body text reaches only ${opaqueLc.toFixed(1)} Lc on its L${opaqueL} floor, under the ${BODY_FLOOR} floor.`,
      );
    }

    /* The ink border: the same --foreground the surface's text uses, mixed toward transparent and painted
       over that surface (a border sits on its element's own background). color-mix(…, transparent) in
       oklch keeps the colour and scales its alpha, which the browser then blends in sRGB, as this does. */
    const inkA = vars[mode].get("glass-border-ink-a") ?? vars.light.get("glass-border-ink-a") ?? 0.5;
    for (const [where, ink, ground] of [
      ["sheer", fg, textSurface],
      ["opaque", opaqueInk, opaqueText],
    ]) {
      const line = compositeSurface(ground, [{ ...ink, a: inkA }]);
      const inkLc = Math.abs(apcaContrast(line, ground));
      if (inkLc < INK_FLOOR) {
        failures.push(
          `[ink] ${p.name} (${mode}, ${where}) — the ink border reaches only ${inkLc.toFixed(1)} Lc against its surface, under the ${INK_FLOOR} non-text floor. Raise --glass-border-ink-a (${inkA}).`,
        );
      }
      inkReport.push({ name: p.name, mode, where, lc: inkLc });
    }

    const known = KNOWN.get(`${p.name}|${mode}`);
    if (known) {
      /* Pinned: must not get WORSE than the value recorded when it was accepted. If it improves past the
         floor the entry is stale and should be deleted, so say so rather than passing silently. */
      if (lc < known.lc - 0.5) {
        failures.push(
          `[known] ${p.name} (${mode}) — a pinned exception got worse: ${lc.toFixed(1)} Lc, was ${known.lc}. ` + `Reason on file: ${known.why}.`,
        );
      } else if (lc >= BODY_FLOOR + MARGIN) {
        failures.push(`[known] ${p.name} (${mode}) — now clears the floor at ${lc.toFixed(1)} Lc. Delete its KNOWN entry; the exception is stale.`);
      }
      continue;
    }

    if (worstLc < BODY_FLOOR) {
      failures.push(
        `[body] ${p.name} (${mode}) — body text reaches only ${worstLc.toFixed(1)} Lc on its own surface${stops.length ? " at its fresco's hardest stop" : ""}, under the ${BODY_FLOOR} floor. ` +
          `Surface L${surface.l.toFixed(1)} from wash L${washL} at alpha ${a}. Alpha slides the surface toward the wash: ` +
          `lower it, or move --glass-wash-l closer to this mode's floor.`,
      );
    } else if (lc < BODY_FLOOR + MARGIN) {
      failures.push(
        `[margin] ${p.name} (${mode}) — ${lc.toFixed(1)} Lc clears the ${BODY_FLOOR} floor by less than ${MARGIN}. ` +
          `Too close to the line to survive a rounding change; back the alpha (${a}) off a step.`,
      );
    }
  }
}

if (process.argv.includes("--report")) {
  for (const r of [...report].sort((x, y) => x.lc - y.lc)) {
    console.log(`  ${r.lc.toFixed(1)} Lc  ${r.name.padEnd(12)} ${r.mode.padEnd(6)} wash L${String(r.washL).padEnd(5)} alpha ${r.a}`);
  }
}

/* Sanity floor: if the scrapers matched nothing the check is worthless. 12 jewels + moonstone +
   4 frescoes + 4 status + selenite = 22 named blocks, x2 modes. */
if (report.length < 30) {
  console.error(`✗ contrast guard: scored only ${report.length} preset/mode pairs — the CSS shape changed, fix the parser`);
  process.exit(1);
}
if (failures.length) {
  console.error(`✗ preset contrast: ${failures.length} failure(s)\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
/* Report the tightest SCORED pair — a pinned exception is by definition under the floor, so including it
   would make the summary contradict itself ("clears the floor everywhere … tightest 65.4"). */
const scored = report.filter((r) => !KNOWN.has(`${r.name}|${r.mode}`));
const worst = scored.reduce((a, b) => (b.lc < a.lc ? b : a));
const inkWorst = inkReport.reduce((a, b) => (b.lc < a.lc ? b : a));
console.log(
  `✓ preset contrast — ${scored.length} preset/mode pairs clear the ${BODY_FLOOR} Lc body floor ` +
    `(tightest ${worst.name} ${worst.mode} at ${worst.lc.toFixed(1)})` +
    (KNOWN.size ? `; ${KNOWN.size} pinned exception${KNOWN.size > 1 ? "s" : ""}: ${[...KNOWN.keys()].join(", ")}` : "") +
    `; ink border ≥ ${INK_FLOOR} Lc on ${inkReport.length} surfaces (tightest ${inkWorst.name} ${inkWorst.mode} ${inkWorst.where} at ${inkWorst.lc.toFixed(1)})`,
);
