#!/usr/bin/env node
/**
 * Theme invariants — a fast, dependency-free guard for the glass tint system.
 *
 * The recurring failure mode this protects against is the CSS-variable-composition gotcha: a token
 * whose value composes `var(--glass-tint-*)` only re-resolves where it's DECLARED. So such a token
 * must live on the grouped `:root, [data-glass-tint]` selector (not bare `:root`/`.dark`), or a
 * `data-glass-tint` scoped to a subtree stops tinting it. See the memory note
 * `css-var-composition-resolves-at-declaration`.
 *
 * Invariants:
 *   1. [scope]  No tint-composing glass token is declared on a BARE :root/.dark (must be grouped).
 *   2. [fg]     The grouped [data-glass-tint] blocks carry NO foreground token (a scoped tint must
 *               not reset a subtree's text color — AutoForeground owns those on :root).
 *   2b.[veil]   --glass-solid-a is composed only inside @utility glass-veil (element-level), and the
 *               veil floor is defined there.
 *   6a.[materials] each [data-material="…"] block pins the full --srf-* set (+ opaque fg / crystal hover).
 *   6b.[recipes-dead] no retired recipe utility (glass-bg/-surface/-solid/…) is defined or class-used.
 *   6c.[material-union] lib/material.ts's Material type == the four CSS materials + "none".
 *   3. [preset] Every GlassTintSwitcher preset (except neutral) has a [data-glass-tint="x"] block.
 *   4. [status] Every status a component renders via data-glass-tint has a [data-glass-tint] block.
 *   5. [fresco] Every fresco preset (sets --glass-crystal-fresco) has a FRESCO_HUES entry.
 *   6. [variants] Every glass component (has a crystal: variant) also has surface: + solid: variants.
 *   7. [sync]   public/r/theme.json embeds the CURRENT flattened theme (registry not stale).
 *   7b.[artifact] registry/theme/globals.css (the committed flattened build) matches the live partials.
 *   8. [tint-sync] Every GlassTintSwitcher preset's h/c/a equals its [data-glass-tint] CSS block(s). The
 *               switcher INLINES the preset onto <html>, shadowing the CSS — so a divergent block renders
 *               fine on the demo (preset wins) but differently for a static, no-switcher consumer (CSS wins).
 *
 * Run: pnpm test   (node scripts/check-theme.mjs)
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { flattenTheme } from "./lib/flatten-theme.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// The theme is authored as app/theme/* partials behind the app/globals.css aggregator; every invariant
// parses the FLATTENED single-file view — the same string consumers install via the registry.
const css = flattenTheme(root);

// Tint-composing tokens intentionally kept on bare :root/.dark: foreground is AutoForeground's, and
// must NOT move into the grouped block or a scoped tint would reset a subtree's text color.
const FOREGROUND_ALLOW = new Set(["--muted-foreground"]);

const failures = [];
const fail = (m) => failures.push(m);

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** Top-level CSS rules (selector + body) via brace-depth tracking — :root/.dark/[data-glass-tint] are flat. */
function topLevelRules(source) {
  const s = stripComments(source);
  const rules = [];
  let depth = 0;
  let segStart = 0;
  let selector = "";
  let bodyStart = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") {
      if (depth === 0) {
        selector = s.slice(segStart, i).trim();
        bodyStart = i + 1;
      }
      depth++;
    } else if (s[i] === "}") {
      depth--;
      if (depth === 0) {
        rules.push({ selector, body: s.slice(bodyStart, i) });
        segStart = i + 1;
      }
    }
  }
  return rules;
}

function decls(body) {
  const out = [];
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(body))) out.push({ name: m[1], value: m[2].trim() });
  return out;
}

const composesTint = (v) => /var\(--glass-tint-[hca]\)/.test(v);
const selectors = (sel) => sel.split(",").map((s) => s.trim());
const isBareRootOrDark = (sel) => {
  const l = selectors(sel);
  return l.length === 1 && (l[0] === ":root" || l[0] === ".dark");
};
// matches the GENERAL grouped blocks only — preset blocks are [data-glass-tint="x"], not the bare attr
const coversScopedTint = (sel) => sel.includes("[data-glass-tint]");

const rules = topLevelRules(css);

// 1. [scope] no tint-composing glass token on a bare :root/.dark
for (const r of rules) {
  if (!isBareRootOrDark(r.selector)) continue;
  for (const d of decls(r.body)) {
    if (composesTint(d.value) && !FOREGROUND_ALLOW.has(d.name)) {
      fail(
        `[scope] ${d.name} composes var(--glass-tint-*) but is on bare "${r.selector}". ` +
          `Move it to the ":root, [data-glass-tint]" group, or scoped data-glass-tint won't re-resolve it.`,
      );
    }
  }
}

// 2. [fg] grouped [data-glass-tint] blocks must not carry foreground tokens
for (const r of rules) {
  if (!coversScopedTint(r.selector)) continue;
  for (const d of decls(r.body)) {
    if (d.name === "--foreground" || d.name === "--muted-foreground") {
      fail(
        `[fg] ${d.name} is on the grouped "${r.selector.replace(/\s+/g, " ")}". ` +
          `A scoped data-glass-tint would reset a subtree's text color — keep foreground tokens on bare :root/.dark.`,
      );
    }
  }
}

// 2b. [veil] --glass-solid-a must be composed on the ELEMENT (in @utility glass-veil), never in a token
//     context (:root/.dark/grouped) — else a scoped --glass-solid-a wouldn't resolve there. (The opaque
//     PAGE style may set --glass-solid-a: 1 as a leaf — that's an override, not a composition — so this
//     only bans it inside a var() expression.)
for (const r of rules) {
  if (!(isBareRootOrDark(r.selector) || coversScopedTint(r.selector))) continue;
  for (const d of decls(r.body)) {
    if (/var\(--glass-solid-a\)/.test(d.value)) {
      fail(
        `[veil] ${d.name} composes var(--glass-solid-a) in "${r.selector}". ` +
          `Compose it in @utility glass-veil (resolves at the element) so a scoped --glass-solid-a works.`,
      );
    }
  }
}
// 2b+. [veil] @utility glass-veil must compose the floor at the element.
{
  const veil = rules.find((r) => r.selector === "@utility glass-veil");
  if (!veil || !/--veil-floor:\s*oklch\(\s*var\(--glass-solid-l\)\s+0\s+0\s*\/\s*var\(--glass-solid-a\)\s*\)/.test(veil.body)) {
    fail(`[veil] @utility glass-veil must compose --veil-floor: oklch(var(--glass-solid-l) 0 0 / var(--glass-solid-a)) — element-level.`);
  }
}

// 3. [preset] every switcher preset (except neutral) has a [data-glass-tint="x"] block
const switcher = readFileSync(join(root, "components/glass-tint-switcher.tsx"), "utf8");
const presets = [...new Set([...switcher.matchAll(/value:\s*"([a-z]+)"/g)].map((m) => m[1]))].filter(
  (v) => v !== "neutral" && v !== "custom",
);
for (const v of presets) {
  if (!css.includes(`[data-glass-tint="${v}"]`)) {
    fail(`[preset] switcher preset "${v}" has no [data-glass-tint="${v}"] block in globals.css.`);
  }
}

// 4. [status] every status a component renders via data-glass-tint has a matching block
const componentFiles = readdirSync(join(root, "components"), { recursive: true }).filter((f) => typeof f === "string" && f.endsWith(".tsx"));
const statuses = new Set();
for (const rel of componentFiles) {
  const src = readFileSync(join(root, "components", rel), "utf8");
  for (const m of src.matchAll(/data-glass-tint=\{([^}]*)\}/g)) {
    for (const lit of m[1].matchAll(/"([a-z-]+)"/g)) statuses.add(lit[1]);
  }
}
for (const s of statuses) {
  if (!css.includes(`[data-glass-tint="${s}"]`)) {
    fail(`[status] a component renders data-glass-tint="${s}" but globals.css has no [data-glass-tint="${s}"] block.`);
  }
}

// 5. [fresco] every fresco preset (sets --glass-crystal-fresco) has a FRESCO_HUES entry, so its
//    canvas/gradient background matches it instead of collapsing to one hue.
const canvasUtils = readFileSync(join(root, "lib/canvas-background-utils.ts"), "utf8");
const huesStart = canvasUtils.indexOf("export const FRESCO_HUES");
const huesBlock = huesStart >= 0 ? canvasUtils.slice(huesStart, canvasUtils.indexOf("};", huesStart)) : "";
const frescoHues = new Set([...huesBlock.matchAll(/^\s+([a-z]+):\s*\[/gm)].map((m) => m[1]));
// 6d. [blur-coupling] surface blur must route through --srf-filter (the token system), never raw
//     backdrop-blur utilities in component class strings — a raw blur keeps paying GPU (and blurring
//     nothing) when the opaque material/page short-circuits the filter. The ONLY sanctioned raw use
//     is a modal overlay SCRIM (a 'fixed inset-0' line blurring the page behind a dialog).
{
  const uiDir = join(root, 'components/ui');
  for (const f of readdirSync(uiDir).filter((x) => x.endsWith('.tsx'))) {
    const src = readFileSync(join(uiDir, f), 'utf8');
    for (const line of src.split("\n")) {
      if (line.includes('backdrop-blur') && !line.includes('fixed inset-0'))
        fail(`[blur-coupling] ${f}: raw backdrop-blur outside an overlay scrim — route it through the material system (--srf-blur / glass-sm/-lg / glass-diffuse).`);
    }
  }
}

// 5b. [bone-sync] bone's night wash knobs are mirrored as AutoForeground fallbacks (the switcher's
//     fg snapshots can't carry them) — the JS constants must equal presets.css, or bone-night text
//     bands against the wrong surface model again (the exact bug the mirror fixes).
{
  const autoFg = readFileSync(join(root, "components/auto-foreground.tsx"), "utf8");
  const boneDark = rules.find((r) => r.selector.replace(/\s+/g, "") === '.dark[data-glass-tint="bone"]');
  if (boneDark) {
    const washL = boneDark.body.match(/--glass-wash-l:\s*([\d.]+)%/)?.[1];
    const cMult = boneDark.body.match(/--glass-wash-c-mult:\s*([\d.]+)/)?.[1];
    if (washL && !autoFg.includes(`bone && dark ? ${washL} :`))
      fail(`[bone-sync] presets.css bone night --glass-wash-l is ${washL}% but auto-foreground's mirrored fallback differs.`);
    if (cMult && !autoFg.includes(`bone && dark ? ${cMult} :`))
      fail(`[bone-sync] presets.css bone night --glass-wash-c-mult is ${cMult} but auto-foreground's mirrored fallback differs.`);
  } else {
    fail('[bone-sync] could not locate the .dark[data-glass-tint="bone"] block in the theme rules.');
  }
}

const frescoPresets = new Set();
for (const r of rules) {
  const m = r.selector.match(/\[data-glass-tint="([a-z]+)"\]/);
  if (m && /--glass-crystal-fresco/.test(r.body)) frescoPresets.add(m[1]);
}
for (const p of frescoPresets) {
  if (!frescoHues.has(p)) {
    fail(`[fresco] preset "${p}" sets --glass-crystal-fresco but has no FRESCO_HUES entry — its canvas/gradient background won't match.`);
  }
}

// 6a. [materials] each of the four [data-material] blocks declares the FULL --srf-* pin set, so an
//     explicit material can never leak an inherited [data-glass] page-remap channel. Opaque also remaps
//     the foreground tiers; crystal swaps its shadow on :hover.
const MATERIALS = ["glass", "frosted", "crystal", "opaque"];
const PIN_SET = ["--srf-bg-image", "--srf-bg-color", "--srf-filter", "--srf-border-color", "--srf-border-w", "--srf-shadow"];
const OPAQUE_FG = ["--foreground", "--foreground-soft", "--foreground-strong", "--foreground-ui", "--muted-foreground"];
for (const m of MATERIALS) {
  const rule = rules.find((r) => selectors(r.selector).includes(`[data-material="${m}"]`));
  if (!rule) {
    fail(`[materials] the theme has no [data-material="${m}"] block.`);
    continue;
  }
  const names = new Set(decls(rule.body).map((d) => d.name));
  for (const t of PIN_SET) {
    if (!names.has(t)) fail(`[materials] [data-material="${m}"] is missing ${t} — an inherited [data-glass] remap would leak through the un-pinned channel.`);
  }
  if (m === "opaque") {
    for (const t of OPAQUE_FG) if (!names.has(t)) fail(`[materials] opaque must remap ${t} to its -opaque twin (its floor can be lighter than the page).`);
  }
}
if (!rules.some((r) => r.selector.includes(`[data-material="crystal"]:hover`) && /--srf-shadow/.test(r.body))) {
  fail(`[materials] crystal is missing its :hover { --srf-shadow } swap.`);
}

// 6b. [recipes-dead] the retired recipe utilities must not be DEFINED (flattened theme) or class-USED
//     (component/app source). The lookbehind/ahead guards exclude the still-live --glass-* TOKENS: in
//     `--glass-solid-a` the leading `-` and trailing `-a` fail the (?<![-\w]) / (?![-\w]) anchors, so
//     only a standalone class (space/quote-delimited) matches. `surface-sm|-lg` precede `surface` so
//     the longer form wins.
const RECIPE_CLASS = /(?<![-\w])glass-(?:bg|surface-sm|surface-lg|surface|solid|frosted|crystal|opaque)(?![-\w])/;
if (/@utility glass-(?:bg|surface|solid|frosted|crystal|opaque)\b/.test(css)) {
  fail(`[recipes-dead] the flattened theme still defines a retired recipe @utility — use the material system.`);
}
for (const dir of ["components", "app"]) {
  for (const rel of readdirSync(join(root, dir), { recursive: true })) {
    if (typeof rel !== "string" || !/\.(tsx|ts)$/.test(rel)) continue;
    // Only class-string positions (className="…" / cn("…") / class inside a JSX code-sample backtick),
    // so aria-labels, prose, and comments don't false-fail; the token-name guards above handle the
    // --glass-* references that live inside those same backticks.
    const src = readFileSync(join(root, dir, rel), "utf8");
    for (const lit of src.matchAll(/(?:className=|cn\()\s*"([^"]*)"|`([^`]*)`/g)) {
      const hit = (lit[1] ?? lit[2] ?? "").match(RECIPE_CLASS);
      if (hit) fail(`[recipes-dead] ${dir}/${rel} uses "${hit[0]}" — use glassMaterial / the glass + axis classes instead.`);
    }
  }
}

// 6c. [material-union] lib/material.ts's Material union == the four CSS materials (+ "none").
const matSrc = readFileSync(join(root, "lib/material.ts"), "utf8");
const union = [...(matSrc.match(/type Material =([^;]+);/)?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map((x) => x[1]);
const expectedUnion = [...MATERIALS, "none"];
if (union.length !== expectedUnion.length || !expectedUnion.every((v) => union.includes(v))) {
  fail(`[material-union] lib/material.ts Material = [${union}] != CSS materials + "none" [${expectedUnion}].`);
}

// 7. [sync] shipped theme.json embeds the current flattened theme
try {
  const theme = JSON.parse(readFileSync(join(root, "public/r/theme.json"), "utf8"));
  const shipped = theme.files?.find((f) => f.path === "registry/theme/globals.css")?.content;
  if (shipped == null) fail(`[sync] public/r/theme.json has no registry/theme/globals.css file.`);
  else if (shipped !== css) fail(`[sync] public/r/theme.json's globals.css is STALE — run "pnpm registry:check" and commit registry/theme + public/r.`);
} catch (e) {
  fail(`[sync] could not read public/r/theme.json: ${e.message}`);
}

// 7b. [artifact] the committed flattened artifact matches the live partials (build-theme output is current)
try {
  const artifact = readFileSync(join(root, "registry/theme/globals.css"), "utf8");
  if (artifact !== css) fail(`[artifact] registry/theme/globals.css is STALE — run "pnpm registry:check" and commit registry/theme + public/r.`);
} catch (e) {
  fail(`[artifact] could not read registry/theme/globals.css — run "pnpm registry:check" (${e.message}).`);
}

// 8. [tint-sync] every switcher preset's h/c/a matches its [data-glass-tint] CSS block(s). The switcher
//    INLINES the preset's tint vars onto <html>, shadowing the CSS block — so a block that disagrees renders
//    correctly on the demo (preset wins) but differently for a static, no-switcher consumer (CSS wins).
const presetTint = new Map(
  [...switcher.matchAll(/value:\s*"([a-z]+)",[\s\S]*?\bh:\s*([\d.]+),\s*c:\s*([\d.]+),\s*a:\s*([\d.]+)/g)].map((m) => [
    m[1],
    { "--glass-tint-h": Number(m[2]), "--glass-tint-c": Number(m[3]), "--glass-tint-a": Number(m[4]) },
  ]),
);
for (const [value, tint] of presetTint) {
  const blocks = rules.filter((r) => r.selector.includes(`[data-glass-tint="${value}"]`));
  if (blocks.length === 0) continue; // neutral has no block — invariant 3 already flags missing blocks
  for (const b of blocks) {
    for (const d of decls(b.body)) {
      if (!(d.name in tint)) continue;
      const cssNum = Number.parseFloat(d.value);
      if (cssNum !== tint[d.name]) {
        fail(
          `[tint-sync] "${value}" ${d.name}: CSS ${cssNum} != switcher preset ${tint[d.name]} ` +
            `(in "${b.selector.replace(/\s+/g, " ")}"). The switcher inlines the preset, shadowing this block — ` +
            `sync them or a static (no-switcher) consumer renders a different surface.`,
        );
      }
    }
  }
}

if (failures.length) {
  console.error(`✗ theme invariants: ${failures.length} failure(s)\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(
  `✓ theme invariants pass — ${rules.length} rules: scope-aware tints, fg isolation, ${presets.length} presets wired + value-synced, ${statuses.size} component tints + ${frescoPresets.size} frescoes consistent, theme.json in sync`,
);
