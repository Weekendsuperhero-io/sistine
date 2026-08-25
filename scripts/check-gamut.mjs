#!/usr/bin/env node
/**
 * Gamut guard for the tint system.
 *
 * Every glass surface composes its color from ONE scalar — `--glass-tint-c` — times a per-surface
 * multiplier, at a per-surface lightness. sRGB's chroma ceiling is a function of BOTH lightness and
 * hue, so a single scalar cannot land equally across 17 presets: at L=97% a request of 0.07 is
 * comfortably inside the gamut for peridot (h128) and roughly double the ceiling for amethyst (h300).
 *
 * When a request exceeds the ceiling the browser does not fail. MEASURED in WebKit (canvas readback,
 * peridot h128 at L 97, whose ceiling is 0.0686):
 *     oklch(97% 0.0686 128) -> 232,255,205    the ceiling; model and browser agree exactly
 *     oklch(97% 0.10   128) -> 226,255,186
 *     oklch(97% 0.20   128) -> 206,255,108
 *     oklch(97% 0.2975 128) -> 185,255,0      pure chartreuse
 * The values diverge monotonically, so this is per-channel CLIPPING, not chroma reduction — an
 * over-ceiling request lands FURTHER from the authored color, not clamped to the nearest in-gamut one.
 * `lib/oklch-utils` is exact up to the boundary and silent past it, and its 3% margin only guards the
 * JS-computed path; authored CSS bypassed it entirely until this check.
 *
 * What that costs is CONTROL, and it is worse than drift: clipping collapses distinct authored colors
 * onto the same rendered one. Turquoise (h190) and aquamarine (h215) both asked 0.2975 at L 97 and both
 * rendered 0,255,255 — two presets, one pixel value, the hue difference gone.
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
 *   3. [cap]     A surface that WRITES a cap has asserted it lands in gamut; it is held to that exactly.
 *   4. [fixed]   A LITERAL chroma authored at a tint-derived hue is checked against the tightest ceiling
 *                across the presets — the sweep above only sees chroma composed FROM --glass-tint-c, so
 *                a hardcoded one (the `hue` gloss flavor's --glass-gloss-c) was invisible to it.
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
      /* Numeric LIGHTNESS vars the preset pins for itself. Presets now set their own --glass-wash-l —
         each hue's chroma ceiling peaks at a different lightness, so a shared wash sat on the downslope
         for most of them — and scoring every preset at tokens.css's single 72/58 would model a surface
         that no preset actually renders. Captured here and applied per row in the evaluator. */
      const vars = new Map(prev.vars ?? []);
      for (const [, k, v] of body.matchAll(/--([a-z0-9-]+):\s*([\d.]+)%?\s*;/g)) vars.set(k, +v);
      out.set(key, { name, dark: !!darkSel, h: h ? +h[1] : prev.h, c: c ? +c[1] : prev.c, vars });
    }
  }
  /* A dark-only block (moonstone) inherits the hue/chroma its light block declared. */
  for (const [key, p] of out) {
    if (p.dark && (p.h === undefined || p.c === undefined)) {
      const base = out.get(p.name);
      out.set(key, { ...p, h: p.h ?? base?.h, c: p.c ?? base?.c, vars: new Map([...(base?.vars ?? []), ...p.vars]) });
    }
  }
  /* The engine default, which selenite and any unlisted tint fall back to. */
  const dh = css.engine.match(/--glass-tint-h:\s*([\d.]+)/);
  const dc = css.engine.match(/--glass-tint-c:\s*([\d.]+)/);
  if (dh && dc) out.set("selenite (default)", { name: "selenite", dark: false, h: +dh[1], c: +dc[1], vars: new Map() });
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

/* Split a stylesheet into top-level rule bodies so a block-LOCAL override is honoured. A flavor block
   may re-pin the var a declaration reads — [data-gloss="hue"] sets its own --glass-gloss-l — and
   resolving that from tokens.css instead would model a surface that never renders while missing the one
   that does. Brace-depth, because these rules are flat. Shared by both scrapers below. */
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
     sweep SILENTLY, which is exactly how --primary sat out of gamut for seven presets unnoticed — and
     then how --glass-gloss-ink did the same. Its multiplier and its cap are BOTH var(--x, default),
     and every var slot below used to accept a bare var(--x) only, so the whole BOTH branch failed to
     match and the gloss was never swept in either mode. Any var slot here must therefore tolerate a
     default; the two ", default" groups exist for exactly that. */
  const re =
    /(?:oklch\(|:\s)\s*(?:(?<lit>[\d.]+)%|var\(--(?<lvar>[a-z0-9-]+)\)|calc\(\s*var\(--(?<lcalc>[a-z0-9-]+)[^)]*\)\s*\*\s*1%\s*\))\s*(?:min\(\s*calc\(\s*var\(--glass-tint-c(?<mhi>-hi)?\)\s*\*\s*(?:(?<mk>[\d.]+)|var\(--(?<mkvar>[a-z0-9-]+)(?:,\s*(?<mkdef>[\d.]+))?\))\s*\)\s*,\s*(?:(?<mcaplit>[\d.]+)|var\(--(?<mcapvar>[a-z0-9-]+)(?:,\s*(?<mcapdef>[\d.]+))?\))\s*\)|calc\(\s*var\(--glass-tint-c(?<hi>-hi)?\)\s*\*\s*(?:(?<k>[\d.]+)|var\(--(?<kvar>[a-z0-9-]+)(?:,\s*(?<kdef>[\d.]+))?\))\s*\)|min\(\s*var\(--glass-tint-c\)\s*,\s*(?:(?<caplit>[\d.]+)|var\(--(?<capvar>[a-z0-9-]+)(?:,\s*(?<capdef>[\d.]+))?\))\s*\))/g;
  for (const [file, src] of Object.entries({ engine: css.engine, materials: css.materials })) {
    for (const body of blocks(src)) {
      /* Numeric custom props declared right here, which shadow the tokens.css values below. */
      const local = new Map();
      for (const [, k, v] of body.matchAll(/--([a-z0-9-]+):\s*([\d.]+)%?\s*;/g)) local.set(k, +v);
      for (const m of body.matchAll(re)) {
        const g = m.groups;
      /* mk/mkdef = the BOTH shape's multiplier; k/kdef = the SCALE shape's. A pure CAP has neither and
         falls through to mult 1 below, which makes min(c × 1, cap) the same as min(c, cap). The *def
         values are the var()'s inline default, used only when the token itself is unresolvable. */
      const k = g.mk ?? g.k ?? g.mkdef ?? g.kdef;
      const lname = g.lvar ?? g.lcalc ?? null;
      const kname = g.kvar ?? g.mkvar ?? null;
      const capName = g.mcapvar ?? g.capvar ?? null;
      const capLit = g.mcaplit ?? g.caplit;
      const capDef = g.mcapdef ?? g.capdef;
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
        /* A multiplier held in a token (e.g. --glass-wash-c-mult, --glass-gloss-tint) is itself
           mode-scoped; the inline default is the last resort, matching CSS's own var() fallback order.
           NOTE this reads the GLOBAL token — a per-preset override (moonstone dials --glass-gloss-tint
           to 1) is not modelled, so the sweep scores every preset at the global multiplier. That is the
           conservative direction for an override that lowers it, and a preset that RAISED one would be
           under-reported here. */
        let mult = k !== undefined ? +k : 1;
        if (kname) {
          const resolved = vars[mode].get(kname) ?? vars.light.get(kname);
          if (resolved !== undefined) mult = resolved;
          else if (k === undefined) continue; /* unresolvable and no default — counted by the sanity floor */
        }
        /* The ceiling is mode-scoped too (--border-c-max is 0.07 light / 0.041 dark, --glass-gloss-c-max
           0.013 light / 0.11 dark). */
        let hardCap;
        if (capLit !== undefined) hardCap = +capLit;
        else if (capName) {
          hardCap = vars[mode].get(capName) ?? vars.light.get(capName) ?? (capDef !== undefined ? +capDef : undefined);
          if (hardCap === undefined) continue; /* unresolvable cap — counted by the sanity floor */
        }
        const shape = hardCap !== undefined ? (mult === 1 ? `≤${hardCap}` : `×${mult} ≤${hardCap}`) : `×${mult}`;
        const label = `${file}:${lname ?? `L${g.lit}`} ${shape}${nearWhiteCap ? " (capped)" : ""}`;
        const id = `${label}|${mode}|${l}`;
        if (seen.has(id)) continue;
        seen.add(id);
        surfaces.push({ label, mode, l, lname, kname, capName, mult, capped: nearWhiteCap, hardCap });
        }
      }
    }
  }
  return surfaces;
}

/* ── FIXED-chroma surfaces: a LITERAL chroma authored at a tint-derived hue ──────────────────────
   The sweep above only recognises chroma composed FROM --glass-tint-c, so a hardcoded number is
   invisible to it no matter how far out of gamut it reaches. That is not hypothetical: the `hue` gloss
   flavor authors oklch(L74 var(--glass-gloss-c) <tint hue ± span>) with --glass-gloss-c a plain 0.16,
   picked believing an over-ceiling request would be mapped down to the ceiling ("holds 81% of that
   chroma"). It clips instead, so the tightest hues rendered with a pinned channel — and nothing here
   said so. A fixed chroma has no per-preset variation, so there is no spread to score; what matters is
   only whether it clears the TIGHTEST ceiling among the hues it will actually be painted at.
   Parsed by walking balanced parens rather than by regex: these hue expressions nest calc(var(…)…),
   which a flat character class cannot span. */
function collectFixed(vars) {
  const out = [];
  const seen = new Set();
  /** The argument text of every oklch(...) in `body`, paren-balanced. */
  const oklchArgs = (body) => {
    const found = [];
    for (let i = body.indexOf("oklch("); i !== -1; i = body.indexOf("oklch(", i + 1)) {
      let depth = 0;
      for (let j = i + 5; j < body.length; j++) {
        if (body[j] === "(") depth++;
        else if (body[j] === ")" && --depth === 0) {
          found.push(body.slice(i + 6, j));
          break;
        }
      }
    }
    return found;
  };
  /** Split on TOP-LEVEL whitespace, stopping at the `/ alpha` component. */
  const topSplit = (s) => {
    const parts = [];
    let depth = 0;
    let cur = "";
    for (const ch of s) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (depth === 0 && ch === "/") break;
      if (depth === 0 && /\s/.test(ch)) {
        if (cur) parts.push(cur);
        cur = "";
      } else cur += ch;
    }
    if (cur) parts.push(cur);
    return parts;
  };
  for (const [file, src] of Object.entries({ engine: css.engine, materials: css.materials })) {
    for (const body of blocks(src)) {
      const local = new Map();
      for (const [, k, v] of body.matchAll(/--([a-z0-9-]+):\s*([\d.]+)%?\s*;/g)) local.set(k, +v);
      for (const args of oklchArgs(body)) {
        const parts = topSplit(args);
        if (parts.length < 3) continue;
        const [lRaw, cRaw] = parts;
        const hue = parts.slice(2).join(" ");
        /* Only hues that TRACK the tint vary per preset; a fixed hue is one color and out of scope. */
        if (!hue.includes("--glass-tint-h")) continue;
        /* Anything referencing the tint chroma is the scaled sweep's job, not this one. */
        if (cRaw.includes("--glass-tint-c")) continue;
        const cLit = /^[\d.]+$/.test(cRaw) ? +cRaw : null;
        const cVar = cRaw.match(/^var\(--([a-z0-9-]+)(?:,\s*([\d.]+))?\)$/);
        if (cLit === null && !cVar) continue;
        const lLit = /^([\d.]+)%$/.exec(lRaw);
        const lVar = lRaw.match(/^calc\(\s*var\(--([a-z0-9-]+)[^)]*\)\s*\*\s*1%\s*\)$/) ?? lRaw.match(/^var\(--([a-z0-9-]+)\)$/);
        for (const mode of ["light", "dark"]) {
          let l;
          if (lLit) l = +lLit[1];
          else if (lVar) {
            const v = local.get(lVar[1]) ?? vars[mode].get(lVar[1]) ?? vars.light.get(lVar[1]);
            if (v === undefined) continue;
            l = v <= 1 ? v * 100 : v;
          } else continue;
          let c = cLit;
          if (c === null) {
            /* Resolution order mirrors CSS: a DECLARED value wins wherever it lives, and the var()'s
               inline default applies only if the token is set nowhere. Taking the default first is
               wrong and silently under-reports — --glass-gloss-c is declared 0.16 in engine.css while
               the hue flavor reads var(--glass-gloss-c, 0.12), so a default-first lookup scored the
               fallback nobody renders and let the real value through unchecked. */
            const declared = (src) => {
              const m = src.match(new RegExp(`--${cVar[1]}:\\s*([\\d.]+)`));
              return m ? +m[1] : undefined;
            };
            c =
              local.get(cVar[1]) ??
              vars[mode].get(cVar[1]) ??
              vars.light.get(cVar[1]) ??
              declared(css.engine) ??
              declared(css.materials) ??
              (cVar[2] !== undefined ? +cVar[2] : undefined);
            if (c === undefined) continue;
          }
          const label = `${file}:${lVar ? lVar[1] : `L${l}`} fixed C=${c}`;
          const id = `${label}|${mode}|${l}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({ label, mode, l, c });
        }
      }
    }
  }
  return out;
}

/* ── Evaluate ───────────────────────────────────────────────────────────────────────────────── */
const presets = collectPresets();
const vars = lightnessVars();
const surfaces = collectSurfaces(vars);
const fixed = collectFixed(vars);
const failures = [];
const accentReport = [];
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
      /* A preset may pin this surface's lightness, multiplier or cap for itself — moonstone's dark block
         pins --glass-opaque-l AND --glass-opaque-c-scale, and the jewels pin --glass-wash-l and their own
         --glass-opaque-c-max. Whatever the preset declares wins, exactly as the cascade resolves it;
         scoring it at the global value invents clipping it does not have (or hides clipping it does). */
      const pinned = s.lname ? p.vars?.get(s.lname) : undefined;
      const surfaceL = pinned === undefined ? s.l : pinned <= 1 ? pinned * 100 : pinned;
      const pinnedMult = s.kname ? p.vars?.get(s.kname) : undefined;
      const pinnedCap = s.capName ? p.vars?.get(s.capName) : undefined;
      const base = s.capped ? Math.min(p.c, TINT_C_HI_CAP) : p.c;
      let want = base * (pinnedMult ?? s.mult);
      const cap = pinnedCap ?? s.hardCap;
      if (cap !== undefined) want = Math.min(want, cap);
      const ceiling = maxSrgbChroma(surfaceL, p.h);
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

/* [fixed] — a hardcoded chroma has no per-preset variation, so spread is meaningless; the only question
   is whether it clears the TIGHTEST ceiling among the hues it gets painted at. Held to 1.0× like an
   explicit cap: authoring a literal is the same assertion as writing one. */
for (const f of fixed) {
  const rows = presets
    .filter((p) => (f.mode === "dark" ? true : !p.dark))
    .map((p) => ({ key: p.key, ceiling: maxSrgbChroma(f.l, p.h) }));
  if (!rows.length) continue;
  const label = `${f.label} (${f.mode}, L=${f.l}%)`;
  const worst = rows.reduce((a, b) => (b.ceiling < a.ceiling ? b : a));
  if (worst.ceiling < CEILING_FLOOR) {
    unattainable.push(label);
    continue;
  }
  const overage = f.c / worst.ceiling;
  if (overage > 1.0001) {
    failures.push(
      `[fixed] ${label} — a literal chroma of ${f.c} exceeds the sRGB ceiling of ${worst.ceiling.toFixed(4)} at ${worst.key} (${overage.toFixed(2)}× over). ` +
        `Over-ceiling requests are CLIPPED, not mapped, so this renders with a pinned channel — lower the chroma or the lightness.`,
    );
  }
  report.push({ label, spread: 1, overage, lo: worst.key, loEff: Math.min(1, worst.ceiling / f.c) });
}

if (process.argv.includes("--report")) {
  for (const r of [...report].sort((a, b) => b.spread - a.spread)) {
    console.log(`  ${r.spread.toFixed(2)}× spread  ${r.overage.toFixed(2)}× over  ${(100 * r.loEff).toFixed(0)}% worst (${r.lo})  ${r.label}`);
  }
  for (const u of unattainable) console.log(`  — no attainable chroma at all: ${u}`);
}

/* ── [accent] the hover/selection fill must be able to CARRY a tint ───────────────────────────────
   The generic [cap] rule above already catches a cap set ABOVE its lightness's ceiling. It cannot catch
   the opposite failure, which is the one that actually shipped: a cap sitting exactly AT the ceiling,
   correct by every gamut test, on a lightness where that ceiling is worth almost nothing. --accent sat at
   L96, where the tightest preset hue tops out at 0.0182 — an RGB spread of 19 — so the hover highlight
   rendered as plain white on every theme and the tint was invisible by arithmetic, not by mistake.
   Chroma near the extremes is not a free parameter; it is whatever the gamut leaves. So the invariant is
   not "the cap fits" but "the lightness leaves room worth having". */
{
  const MIN_TINTABLE = 0.03; // ~RGB spread 30 at the tightest hue — the point a tint reads as a colour
  for (const [mode, body] of [
    ["light", css.tokens.slice(css.tokens.indexOf(":root {"), css.tokens.indexOf(".dark {"))],
    ["dark", css.tokens.slice(css.tokens.indexOf(".dark {"))],
  ]) {
    const bare = body.replace(/\/\*[\s\S]*?\*\//g, "");
    const l = /--accent-bg-l:\s*([\d.]+)/.exec(bare);
    if (!l) {
      failures.push(`[accent] ${mode}: could not read --accent-bg-l from tokens.css — if it was renamed, update this rule rather than dropping it.`);
      continue;
    }
    const L = Number(l[1]) * 100;
    let worst = { ceiling: Infinity, key: "" };
    for (const p of presets) {
      const ceiling = maxSrgbChroma(L, p.h);
      if (ceiling < worst.ceiling) worst = { ceiling, key: p.key };
    }
    if (worst.ceiling < MIN_TINTABLE) {
      failures.push(
        `[accent] ${mode}: --accent-bg-l ${l[1]} sits where the sRGB ceiling is only ${worst.ceiling.toFixed(4)} (tightest hue: ${worst.key}), under the ${MIN_TINTABLE} a tint needs to read as a colour. ` +
          `The hover/selection fill will render as flat white or black whatever the theme. Move the lightness off the extreme — no cap can fix this.`,
      );
    }
    accentReport.push(`${mode} L${L.toFixed(0)} ceiling ${worst.ceiling.toFixed(4)} (${worst.key})`);
  }
}

/* A sanity floor: the check is worthless if the scrapers silently matched nothing. */
if (presets.length < 15 || surfaces.length < 8 || fixed.length < 2) {
  console.error(
    `✗ gamut guard: scraped only ${presets.length} presets / ${surfaces.length} scaled surfaces / ${fixed.length} fixed-chroma surfaces — the CSS shape changed, fix the parser`,
  );
  process.exit(1);
}
if (failures.length) {
  console.error(`✗ tint gamut: ${failures.length} failure(s)\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
const worstSpread = Math.max(...report.map((r) => r.spread));
const worstOver = Math.max(...report.map((r) => r.overage));
console.log(
  `✓ tint gamut — ${presets.length} presets × ${surfaces.length} scaled + ${fixed.length} fixed-chroma surface/mode pairs: ` +
    `worst spread ${worstSpread.toFixed(2)}× (max ${SPREAD_MAX}), worst overage ${worstOver.toFixed(2)}× (max ${OVERAGE_MAX}); accent ${accentReport.join(" | ")}`,
);
// Verify a known in-gamut pair still reads as in-gamut, so a broken import can't pass silently.
if (!inSrgbGamut(50, 0.05, 200)) {
  console.error("✗ gamut guard: oklch-utils disagrees on a known in-gamut color — import is wrong");
  process.exit(1);
}
