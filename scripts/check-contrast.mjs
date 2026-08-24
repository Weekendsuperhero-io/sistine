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
import { apcaContrast, glassSolidSurface, READABLE_USAGE, readableForeground } from "../lib/oklch-utils.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const BODY_FLOOR = READABLE_USAGE.body.floor; // 75 — read from the source of truth, never hardcoded
const MARGIN = 1.5; // Lc of slack required on top of the floor

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
const KNOWN = new Map([["moonstone|dark", { lc: 65.4, why: "cream floor on a dark page lands mid-tone through the solidify layer — needs a design decision, not a tuning change" }]]);

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
      const rec = out.get(name) ?? { name, light: new Map(), dark: new Map() };
      const target = darkSel ? rec.dark : rec.light;
      for (const [, k, v] of body.matchAll(/--([a-z0-9-]+):\s*([\d.]+)%?\s*;/g)) target.set(k, +v);
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

for (const p of all) {
  for (const mode of ["light", "dark"]) {
    const dark = mode === "dark";
    const h = resolve(p, mode, vars, "glass-tint-h");
    const c = resolve(p, mode, vars, "glass-tint-c");
    const a = resolve(p, mode, vars, "glass-tint-a");
    if (h === undefined || c === undefined || a === undefined) continue; // selenite has no block

    const washL = resolve(p, mode, vars, "glass-wash-l", dark ? 58 : 72);
    const washCMult = resolve(p, mode, vars, "glass-wash-c-mult", 2.5);
    const opaqueL = resolve(p, mode, vars, "glass-opaque-l", dark ? 36.4 : 88);
    const cScale = resolve(p, mode, vars, "glass-opaque-c-scale", dark ? 1.05 : 0.85);
    const cMax = resolve(p, mode, vars, "glass-opaque-c-max", dark ? 0.12 : 0.055);
    const solidA = vars[mode].get("glass-solid-a") ?? 0.65;

    /* The same composition components/auto-foreground.tsx models: the veil/solid floor, the solidify
       layer (--glass-opacity, 0.7 fallback) over it, then the tint wash on top. */
    const surface = glassSolidSurface(dark, { h, c, a }, solidA, washL, washCMult, {
      l: opaqueL,
      c: Math.min(c * cScale, cMax),
      a: 0.7,
    });
    const fg = readableForeground(surface, { ...READABLE_USAGE.body, hue: h, chroma: 0.15 });
    const lc = Math.abs(apcaContrast(fg, surface));
    report.push({ name: p.name, mode, lc, washL, a });

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

    if (lc < BODY_FLOOR) {
      failures.push(
        `[body] ${p.name} (${mode}) — body text reaches only ${lc.toFixed(1)} Lc on its own surface, under the ${BODY_FLOOR} floor. ` +
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
   4 frescoes + 4 status = 21 named blocks, x2 modes, minus selenite which has no block. */
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
console.log(
  `✓ preset contrast — ${scored.length} preset/mode pairs clear the ${BODY_FLOOR} Lc body floor ` +
    `(tightest ${worst.name} ${worst.mode} at ${worst.lc.toFixed(1)})` +
    (KNOWN.size ? `; ${KNOWN.size} pinned exception${KNOWN.size > 1 ? "s" : ""}: ${[...KNOWN.keys()].join(", ")}` : ""),
);
