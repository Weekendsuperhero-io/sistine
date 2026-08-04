#!/usr/bin/env node
/**
 * Gamut guard for the tint system.
 *
 * Every glass surface composes its color from ONE scalar — `--glass-tint-c` — times a per-surface
 * multiplier, at a per-surface lightness. sRGB's chroma ceiling is a function of BOTH lightness and
 * hue, so a single scalar cannot land equally across 17 presets: at L=97% a request of 0.07 is
 * comfortably inside the gamut for peridot (h128) and roughly double the ceiling for amethyst (h300).
 *
 * When a request exceeds the ceiling the browser does not fail — it gamut-maps, trading lightness for
 * chroma. That is why this never looked broken. What it costs is CONTROL: the delivered color stops
 * tracking the authored one, and how far it drifts is the engine's choice, not ours. `lib/oklch-utils`
 * already carries a 3% margin for exactly this reason ("foregrounds/icons went grey in Safari while
 * staying tinted in Chrome") — but that margin only guards the JS-computed path. Authored CSS bypassed
 * it entirely until this check.
 *
 * IMPORTANT — asking past the ceiling is not automatically a bug. Delivered chroma keeps rising with
 * the request (measured in Safari: it never plateaus), so a preset that asks a lot and gets mapped can
 * still render MORE color than one that asks little and lands exactly. Lapis is the worked example: it
 * asks 0.15 at h268, the least-headroom jewel hue, delivers only ~22% of that on the opaque body — and
 * still renders 1.32× sapphire's wash chroma, which is the entire point of the preset. Lowering it to
 * "stay in gamut" was tried and made it render FLATTER than sapphire.
 *
 * So this does not police intent. It pins the CURRENT, measured amount of gamut dependence so it
 * cannot silently grow: a new preset or a retuned multiplier that reaches further out than anything
 * here today has to say so.
 *
 * What this asserts:
 *   1. [overage] No preset × surface × mode requests more than OVERAGE_MAX times the sRGB ceiling.
 *   2. [spread]  At a given surface, the fraction of its declared chroma that survives varies across
 *                presets by no more than SPREAD_MAX.
 *
 * Run: pnpm test:gamut   (needs Node >= 22 to type-strip the imported .ts)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inSrgbGamut, maxSrgbChroma } from "../lib/oklch-utils.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

/* BASELINES, not targets. Both are pinned just above today's worst case (4.50×, lapis on the light
   opaque body) so the suite fails on DRIFT rather than on the design. Tightening them means retuning
   a multiplier or a preset and re-measuring in a browser — the numbers here are only half the story,
   since the ceiling is where the gamut ENDS, not where the engine lands after mapping. */
const OVERAGE_MAX = 4.6;
const SPREAD_MAX = 4.6;

const css = {
  engine: read("app/theme/engine.css"),
  materials: read("app/theme/materials.css"),
  presets: read("app/theme/presets.css"),
  frescoes: read("app/theme/frescoes.css"),
  tokens: read("app/theme/tokens.css"),
};

/* ── Presets: hue + chroma per [data-glass-tint] block ───────────────────────────────────────── */
function collectPresets() {
  const out = new Map();
  for (const src of [css.presets, css.frescoes]) {
    const re = /((?:\.dark)?)(?:\[data-glass-tint="([^"]+)"\][^{]*)\{([^}]*)\}/g;
    for (const [, darkSel, name, body] of src.matchAll(re)) {
      const h = body.match(/--glass-tint-h:\s*([\d.]+)/);
      const c = body.match(/--glass-tint-c:\s*([\d.]+)/);
      const key = `${name}${darkSel ? " (dark)" : ""}`;
      const prev = out.get(key) ?? {};
      out.set(key, { name, dark: !!darkSel, h: h ? +h[1] : prev.h, c: c ? +c[1] : prev.c });
    }
  }
  /* A dark-only block (moonstone) inherits the hue/chroma its light block declared. */
  for (const [key, p] of out) {
    if (p.dark && (p.h === undefined || p.c === undefined)) {
      const base = out.get(p.name);
      out.set(key, { ...p, h: p.h ?? base?.h, c: p.c ?? base?.c });
    }
  }
  /* The engine default, which selenite and any unlisted tint fall back to. */
  const dh = css.engine.match(/--glass-tint-h:\s*([\d.]+)/);
  const dc = css.engine.match(/--glass-tint-c:\s*([\d.]+)/);
  if (dh && dc) out.set("selenite (default)", { name: "selenite", dark: false, h: +dh[1], c: +dc[1] });
  return [...out.entries()].filter(([, p]) => p.h !== undefined && p.c !== undefined).map(([key, p]) => ({ key, ...p }));
}

/* ── Lightness vars, resolved per mode from tokens.css's :root / .dark blocks ────────────────── */
function lightnessVars() {
  const rootBody = css.tokens.slice(css.tokens.indexOf(":root {"), css.tokens.indexOf(".dark {"));
  const darkBody = css.tokens.slice(css.tokens.indexOf(".dark {"));
  const grab = (body) => {
    const m = new Map();
    for (const [, k, v] of body.matchAll(/--([a-z0-9-]+):\s*([\d.]+)%?\s*;/g)) m.set(k, +v);
    return m;
  };
  return { light: grab(rootBody), dark: grab(darkBody) };
}

/* ── Surfaces: every declaration composing tint chroma, scraped so the table cannot drift ────── */
function collectSurfaces(vars) {
  const surfaces = [];
  const seen = new Set();
  /* oklch(<lightness> calc(var(--glass-tint-c) * <mult>) …) — lightness is a literal %, a bare var(),
     or calc(var(--x) * 1%). Multiplier may itself be a var() with a numeric default. */
  const re =
    /(?:oklch\(|:\s)\s*(?:(?<lit>[\d.]+)%|var\(--(?<lvar>[a-z0-9-]+)\)|calc\(\s*var\(--(?<lcalc>[a-z0-9-]+)[^)]*\)\s*\*\s*1%\s*\))\s*calc\(\s*var\(--glass-tint-c(?<hi>-hi)?\)\s*\*\s*(?:(?<k>[\d.]+)|var\(--(?<kvar>[a-z0-9-]+)(?:,\s*(?<kdef>[\d.]+))?\))\s*\)/g;
  for (const [file, src] of Object.entries({ engine: css.engine, materials: css.materials })) {
    for (const m of src.matchAll(re)) {
      const g = m.groups;
      const k = g.k !== undefined ? +g.k : +g.kdef;
      const lname = g.lvar ?? g.lcalc ?? null;
      const kname = g.kvar ?? null;
      for (const mode of ["light", "dark"]) {
        let l;
        if (g.lit !== undefined) l = +g.lit;
        else {
          const v = vars[mode].get(lname) ?? vars.light.get(lname);
          if (v === undefined) continue;
          l = v <= 1 ? v * 100 : v; /* --primary-l is authored 0–1, the rest as 0–100 */
        }
        /* A multiplier held in a token (e.g. --glass-wash-c-mult) is itself mode-scoped. */
        let mult = k;
        if (kname) {
          const resolved = vars[mode].get(kname) ?? vars.light.get(kname) ?? k;
          if (resolved === undefined) continue; /* unresolvable multiplier — counted by the sanity floor */
          mult = resolved;
        }
        const label = `${file}:${lname ?? `L${g.lit}`} ×${mult}${g.hi ? " (capped)" : ""}`;
        const id = `${label}|${mode}|${l}`;
        if (seen.has(id)) continue;
        seen.add(id);
        surfaces.push({ label, mode, l, mult, capped: !!g.hi });
      }
    }
  }
  return surfaces;
}

/* ── Evaluate ───────────────────────────────────────────────────────────────────────────────── */
const presets = collectPresets();
const vars = lightnessVars();
const surfaces = collectSurfaces(vars);
const failures = [];
const report = [];
const unattainable = [];

/* Below this the sRGB ceiling is indistinguishable from zero: at L≈100% white is the ONLY color, so
   no authored value could pass and comparing presets there is meaningless. Those surfaces are
   counted separately rather than scored. */
const CEILING_FLOOR = 0.005;

/* The near-white cap, read from the CSS so this check cannot drift from it. */
const capMatch = css.engine.match(/--glass-tint-c-hi:\s*min\(\s*var\(--glass-tint-c\)\s*,\s*([\d.]+)\s*\)/);
if (!capMatch) {
  console.error("\u2717 gamut guard: --glass-tint-c-hi is not a min(var(--glass-tint-c), N) in engine.css \u2014 fix the parser or the token");
  process.exit(1);
}
const TINT_C_HI_CAP = +capMatch[1];

for (const s of surfaces) {
  const rows = presets
    .filter((p) => (s.mode === "dark" ? true : !p.dark))
    .map((p) => {
      const want = (s.capped ? Math.min(p.c, TINT_C_HI_CAP) : p.c) * s.mult;
      const ceiling = maxSrgbChroma(s.l, p.h);
      /* Efficiency, not absolute chroma: a preset that DECLARES more color should deliver more. What
         must not vary is how much of its declared intent survives. */
      return { key: p.key, want, ceiling, efficiency: Math.min(1, ceiling / want), overage: want / ceiling };
    });
  if (!rows.length) continue;

  const label = `${s.label} (${s.mode}, L=${s.l}%)`;
  if (rows.every((r) => r.ceiling < CEILING_FLOOR)) {
    unattainable.push(label);
    continue;
  }

  const worst = rows.reduce((a, b) => (b.overage > a.overage ? b : a));
  if (worst.overage > OVERAGE_MAX) {
    failures.push(
      `[overage] ${label} — ${worst.key} asks C=${worst.want.toFixed(4)} against an sRGB ceiling of ${worst.ceiling.toFixed(4)} (${worst.overage.toFixed(2)}× over, max ${OVERAGE_MAX}×)`,
    );
  }

  const lo = rows.reduce((a, b) => (b.efficiency < a.efficiency ? b : a));
  const hi = rows.reduce((a, b) => (b.efficiency > a.efficiency ? b : a));
  const spread = hi.efficiency / Math.max(lo.efficiency, 1e-6);
  if (spread > SPREAD_MAX) {
    failures.push(
      `[spread] ${label} — ${lo.key} delivers only ${Math.round(100 * lo.efficiency)}% of its declared chroma where ${hi.key} delivers ${Math.round(100 * hi.efficiency)}% (${spread.toFixed(2)}× apart, max ${SPREAD_MAX}×)`,
    );
  }
  report.push({ label, spread, overage: worst.overage, lo: lo.key, loEff: lo.efficiency });
}

if (process.argv.includes("--report")) {
  for (const r of [...report].sort((a, b) => b.spread - a.spread)) {
    console.log(`  ${r.spread.toFixed(2)}× spread  ${r.overage.toFixed(2)}× over  ${(100 * r.loEff).toFixed(0)}% worst (${r.lo})  ${r.label}`);
  }
  for (const u of unattainable) console.log(`  — no attainable chroma at all: ${u}`);
}

/* A sanity floor: the check is worthless if the scrapers silently matched nothing. */
if (presets.length < 15 || surfaces.length < 8) {
  console.error(`✗ gamut guard: scraped only ${presets.length} presets / ${surfaces.length} surfaces — the CSS shape changed, fix the parser`);
  process.exit(1);
}
if (failures.length) {
  console.error(`✗ tint gamut: ${failures.length} failure(s)\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
const worstSpread = Math.max(...report.map((r) => r.spread));
const worstOver = Math.max(...report.map((r) => r.overage));
console.log(
  `✓ tint gamut — ${presets.length} presets × ${surfaces.length} surface/mode pairs: worst spread ${worstSpread.toFixed(2)}× (max ${SPREAD_MAX}), worst overage ${worstOver.toFixed(2)}× (max ${OVERAGE_MAX})`,
);
// Verify a known in-gamut pair still reads as in-gamut, so a broken import can't pass silently.
if (!inSrgbGamut(50, 0.05, 200)) {
  console.error("✗ gamut guard: oklch-utils disagrees on a known in-gamut color — import is wrong");
  process.exit(1);
}
