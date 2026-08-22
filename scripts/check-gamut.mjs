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
 * Run: bun run test:gamut   (needs Node >= 22 to type-strip the imported .ts)
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
  /* oklch(<lightness> <chroma> …) — lightness is a literal %, a bare var(), or calc(var(--x) * 1%).
     THREE chroma shapes are scraped, because the engine authors all three:
       SCALE   calc(var(--glass-tint-c[-hi]) * <mult>)                 — a multiple of the tint chroma
       CAP     min(var(--glass-tint-c), <cap>)                         — the tint chroma clamped
       BOTH    min(calc(var(--glass-tint-c[-hi]) * <mult>), <cap>)     — scaled, THEN clamped
     Multiplier and cap may each be a mode-scoped token, resolved per mode below.
     BOTH exists for --primary, where the ×1.2 is design intent (primary reads more saturated than the
     base tint) but has to stop at the sRGB edge. Order is load-bearing and the evaluator below applies
     it as min(c × mult, cap): capping BEFORE the multiplier gives a different answer — at c 0.07 with
     cap 0.07, min(0.084, 0.07) = 0.07, but min(0.07, 0.07) × 1.2 = 0.084, which is back out of gamut.
     Adding a shape here is not optional bookkeeping: an unmatched shape drops that surface from the
     sweep SILENTLY, which is exactly how --primary sat out of gamut for seven presets unnoticed. */
  const re =
    /(?:oklch\(|:\s)\s*(?:(?<lit>[\d.]+)%|var\(--(?<lvar>[a-z0-9-]+)\)|calc\(\s*var\(--(?<lcalc>[a-z0-9-]+)[^)]*\)\s*\*\s*1%\s*\))\s*(?:min\(\s*calc\(\s*var\(--glass-tint-c(?<mhi>-hi)?\)\s*\*\s*(?<mk>[\d.]+)\s*\)\s*,\s*(?:(?<mcaplit>[\d.]+)|var\(--(?<mcapvar>[a-z0-9-]+)\))\s*\)|calc\(\s*var\(--glass-tint-c(?<hi>-hi)?\)\s*\*\s*(?:(?<k>[\d.]+)|var\(--(?<kvar>[a-z0-9-]+)(?:,\s*(?<kdef>[\d.]+))?\))\s*\)|min\(\s*var\(--glass-tint-c\)\s*,\s*(?:(?<caplit>[\d.]+)|var\(--(?<capvar>[a-z0-9-]+)\))\s*\))/g;
  /* Split into top-level rule bodies so a block-LOCAL lightness override is honoured. A flavor block
     may re-pin the var a declaration reads — [data-gloss="hue"] sets its own --glass-gloss-l — and
     resolving that from tokens.css instead would model a surface that never renders while missing the
     one that does. Brace-depth, because these rules are flat. */
  const blocks = (source) => {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < source.length; i++) {
      if (source[i] === "{") {
        if (depth === 0) start = i + 1;
        depth++;
      } else if (source[i] === "}") {
        depth--;
        if (depth === 0) out.push(source.slice(start, i));
      }
    }
    return out;
  };
  for (const [file, src] of Object.entries({ engine: css.engine, materials: css.materials })) {
    for (const body of blocks(src)) {
      /* Numeric custom props declared right here, which shadow the tokens.css values below. */
      const local = new Map();
      for (const [, k, v] of body.matchAll(/--([a-z0-9-]+):\s*([\d.]+)%?\s*;/g)) local.set(k, +v);
      for (const m of body.matchAll(re)) {
        const g = m.groups;
      /* mk = the BOTH shape's multiplier; k/kdef = the SCALE shape's. A pure CAP has neither and
         falls through to mult 1 below, which makes min(c × 1, cap) the same as min(c, cap). */
      const k = g.mk !== undefined ? +g.mk : g.k !== undefined ? +g.k : g.kdef !== undefined ? +g.kdef : 1;
      const lname = g.lvar ?? g.lcalc ?? null;
      const kname = g.kvar ?? null;
      const capName = g.mcapvar ?? g.capvar ?? null;
      const capLit = g.mcaplit ?? g.caplit;
      const nearWhiteCap = !!(g.hi || g.mhi);
      for (const mode of ["light", "dark"]) {
        let l;
        if (g.lit !== undefined) l = +g.lit;
        else {
          /* Block-local first: a flavor block that re-pins the lightness var owns it here. */
          const v = local.get(lname) ?? vars[mode].get(lname) ?? vars.light.get(lname);
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
        /* The ceiling is mode-scoped too (--border-c-max is 0.07 light / 0.041 dark). */
        let hardCap;
        if (capLit !== undefined) hardCap = +capLit;
        else if (capName) {
          hardCap = vars[mode].get(capName) ?? vars.light.get(capName);
          if (hardCap === undefined) continue; /* unresolvable cap — counted by the sanity floor */
        }
        const shape = hardCap !== undefined ? (mult === 1 ? `≤${hardCap}` : `×${mult} ≤${hardCap}`) : `×${mult}`;
        const label = `${file}:${lname ?? `L${g.lit}`} ${shape}${nearWhiteCap ? " (capped)" : ""}`;
        const id = `${label}|${mode}|${l}`;
        if (seen.has(id)) continue;
        seen.add(id);
        surfaces.push({ label, mode, l, mult, capped: nearWhiteCap, hardCap });
        }
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
      /* Effective authored chroma, in the order CSS evaluates it: the near-white cap on the tint
         chroma, then the multiplier, then the surface's own hard cap. Capping before the multiplier
         would under-report — min(c, cap) × mult can land back outside the gamut the cap exists to
         hold. A pure CAP surface carries mult 1, so this reduces to min(c, cap) for it. */
      const base = s.capped ? Math.min(p.c, TINT_C_HI_CAP) : p.c;
      let want = base * s.mult;
      if (s.hardCap !== undefined) want = Math.min(want, s.hardCap);
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
  /* A surface that declares a hard cap has ASSERTED it stays inside the gamut — that is the entire
     point of writing one. Hold it to that exactly, independently of the drift baselines below, which
     are deliberately loose (4.6×) because the uncapped opaque body still asks 4.50×. Without this a
     cap could sit at, say, 2.8× — in gamut for no preset, mapped by the browser everywhere — and
     still pass, which would make the cap decorative. */
  if (s.hardCap !== undefined && worst.overage > 1.0001) {
    failures.push(
      `[cap] ${label} — declares a cap of ${s.hardCap}, but ${worst.key} still asks C=${worst.want.toFixed(4)} against an sRGB ceiling of ` +
        `${worst.ceiling.toFixed(4)} (${worst.overage.toFixed(2)}× over). A cap exists to land inside the gamut — lower it, or lower the lightness.`,
    );
  }
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
