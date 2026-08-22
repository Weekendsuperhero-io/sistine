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
 *   3. [preset] Every GlassTintSwitcher preset (except selenite) has a [data-glass-tint="x"] block.
 *   4. [status] Every status a component renders via data-glass-tint has a [data-glass-tint] block.
 *   5. [fresco] Every fresco preset (sets --glass-crystal-fresco) has a FRESCO_HUES entry.
 *   6. [variants] Every glass component (has a crystal: variant) also has surface: + solid: variants.
 *   7. [sync]   public/r/theme.json embeds the CURRENT flattened theme (registry not stale).
 *   7b.[artifact] registry/theme/globals.css (the committed flattened build) matches the live partials.
 *   8. [tint-sync] Every GlassTintSwitcher preset's h/c/a equals its [data-glass-tint] CSS block(s). The
 *               switcher INLINES the preset onto <html>, shadowing the CSS — so a divergent block renders
 *               fine on the demo (preset wins) but differently for a static, no-switcher consumer (CSS wins).
 *
 * Run: bun run test   (node scripts/check-theme.mjs)
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { flattenTheme } from "./lib/flatten-theme.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// The theme is authored as app/theme/* partials behind the app/globals.css aggregator; every invariant
// parses the FLATTENED single-file view — the same string consumers install via the registry.
const css = flattenTheme(root);

// Tint-composing tokens intentionally kept on bare :root/.dark: the FOREGROUND family is
// AutoForeground's, and must NOT move into the grouped block or a scoped tint would reset a subtree's
// text color — that is invariant 2 stated from the other side. Matched by name rather than an explicit
// list: the family is open-ended (--foreground, -soft/-strong/-ui, the -opaque/-crystal tier sets,
// --muted-foreground and ITS tier twins), every member composes --glass-fg-h, and the old single-entry
// set only covered --muted-foreground because the narrower composesTint pattern missed the rest.
const isForegroundToken = (name) => name.includes("foreground");

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

/* --glass-tint-h/c/a AND their derived anchors (--glass-tint-c-hi, the near-white chroma cap, and
   --glass-fg-h, the foreground hue). The derived two live in the tint-anchor block and so re-resolve
   per scope exactly like the raw knobs — a token composing them from a bare :root bakes in the ROOT
   value and stops tracking a scoped data-glass-tint, which is the same bug, silently. The old pattern
   only matched a single char before `)`, so `var(--glass-tint-c-hi)` slipped through. */
const composesTint = (v) => /var\(--glass-tint-(?:[hca]\b|c-hi)|var\(--glass-fg-h\)/.test(v);
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
    if (composesTint(d.value) && !isForegroundToken(d.name)) {
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

// 3. [preset] every switcher preset (except selenite) has a [data-glass-tint="x"] block
const switcher = readFileSync(join(root, "components/glass-tint-switcher.tsx"), "utf8");
const presets = [...new Set([...switcher.matchAll(/value:\s*"([a-z]+)"/g)].map((m) => m[1]))].filter(
  (v) => v !== "selenite" && v !== "custom",
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
// 6e. [axis-props] any component that calls materialSurface must type its per-instance axes via the
//     canonical MaterialAxisProps (lib/material) AND route them through splitAxisProps — a hand-listed
//     subset (in the type or the destructure) goes stale whenever an axis is added (diffuse) or widened
//     (border weights), so the new knob silently fails to type or forward.
{
  const uiDir = join(root, 'components/ui');
  for (const f of readdirSync(uiDir).filter((x) => x.endsWith('.tsx'))) {
    const src = readFileSync(join(uiDir, f), 'utf8');
    if (src.includes('materialSurface(') && !src.includes('MaterialAxisProps'))
      fail(`[axis-props] ${f}: calls materialSurface but hand-lists axis props — spread MaterialAxisProps so new axes (diffuse, border weights) type everywhere.`);
    if (src.includes('materialSurface(') && !src.includes('splitAxisProps('))
      fail(`[axis-props] ${f}: calls materialSurface but destructures axis props by hand — route axis props through splitAxisProps so new axes are zero-touch.`);
  }
}

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

// 6f. [no-webkit-twin] never hand-author -webkit-backdrop-filter: Lightning CSS dedupes the pair
//     keeping the PREFIXED one — which Chromium never aliased — so glass renders in WebKit and
//     computes none in Chrome/Edge. Author the standard property; the minifier auto-prefixes.
if (/-webkit-backdrop-filter/.test(css)) fail('[no-webkit-twin] hand-authored -webkit-backdrop-filter found in the theme — remove it (Lightning auto-prefixes; the twin makes it DROP the standard property).');

// 5b. [moonstone-sync] moonstone's night wash knobs are mirrored as AutoForeground fallbacks (the switcher's
//     fg snapshots can't carry them) — the JS constants must equal presets.css, or moonstone-night text
//     bands against the wrong surface model again (the exact bug the mirror fixes).
{
  const autoFg = readFileSync(join(root, "components/auto-foreground.tsx"), "utf8");
  const moonstoneDark = rules.find((r) => r.selector.replace(/\s+/g, "") === '.dark[data-glass-tint="moonstone"]');
  if (moonstoneDark) {
    const washL = moonstoneDark.body.match(/--glass-wash-l:\s*([\d.]+)%/)?.[1];
    const cMult = moonstoneDark.body.match(/--glass-wash-c-mult:\s*([\d.]+)/)?.[1];
    if (washL && !autoFg.includes(`moonstone && dark ? ${washL} :`))
      fail(`[moonstone-sync] presets.css moonstone night --glass-wash-l is ${washL}% but auto-foreground's mirrored fallback differs.`);
    if (cMult && !autoFg.includes(`moonstone && dark ? ${cMult} :`))
      fail(`[moonstone-sync] presets.css moonstone night --glass-wash-c-mult is ${cMult} but auto-foreground's mirrored fallback differs.`);
  } else {
    fail('[moonstone-sync] could not locate the .dark[data-glass-tint="moonstone"] block in the theme rules.');
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

// 6a. [materials] each of the five [data-material] blocks declares the FULL --srf-* pin set, so an
//     explicit material can never leak an inherited [data-glass] page-remap channel. Opaque also remaps
//     the foreground tiers; crystal swaps its shadow on :hover.
const MATERIALS = ["glass", "frosted", "crystal", "chakra", "opaque"];
const PIN_SET = ["--srf-bg-image", "--srf-bg-color", "--srf-filter", "--srf-border-color", "--srf-border-w", "--srf-shadow"];
const OPAQUE_FG = ["--foreground", "--foreground-soft", "--foreground-strong", "--foreground-ui", "--muted-foreground"];
/* Materials whose floor lightness is its own dial and can sit far from the page's, so they must remap
   the foreground tiers to their own set: opaque's solid floor, and chakra's table. */
const FG_REMAP_MATERIALS = ["opaque", "chakra"];
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
  if (FG_REMAP_MATERIALS.includes(m)) {
    /* The remap may live on the base block (opaque) or on a veil-guarded companion (chakra, matching
       crystal's pattern), so look across both — what matters is that the tiers ARE remapped. */
    const remapped = new Set(
      rules
        .filter((r) => selectors(r.selector).some((s) => s.startsWith(`[data-material="${m}"]`) && !s.includes(":hover")))
        .flatMap((r) => decls(r.body).map((d) => d.name)),
    );
    for (const t of OPAQUE_FG) {
      if (!remapped.has(t)) fail(`[materials] ${m} must remap ${t} to its -${m} twin (its floor lightness is its own dial and can sit far from the page's).`);
    }
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
  else if (shipped !== css) fail(`[sync] public/r/theme.json's globals.css is STALE — run "bun run registry:check" and commit registry/theme + public/r.`);
} catch (e) {
  fail(`[sync] could not read public/r/theme.json: ${e.message}`);
}

// 7b. [artifact] the committed flattened artifact matches the live partials (build-theme output is current)
try {
  const artifact = readFileSync(join(root, "registry/theme/globals.css"), "utf8");
  if (artifact !== css) fail(`[artifact] registry/theme/globals.css is STALE — run "bun run registry:check" and commit registry/theme + public/r.`);
} catch (e) {
  fail(`[artifact] could not read registry/theme/globals.css — run "bun run registry:check" (${e.message}).`);
}

// 9. [opaque-fill] no raw bg-white / bg-black FILL at alpha >= 0.5 in a component class string.
//     Everything in this theme gets its hue from the surface underneath, so a fill's alpha is exactly
//     how much of that hue survives: at 0.2 four fifths of the tint shows through and the element reads
//     on-theme, at 0.8 only a fifth does and it reads flat white or flat black no matter which preset
//     is active. That is the bug the active tab/toggle shipped with — `bg-white/80 dark:bg-white/20`,
//     which looked correct in dark and lost the hue entirely in light, in every theme.
//     LOW-alpha raw white/black is deliberately allowed: a scrim or a bevel SHOULD be pure, not a
//     tinted neutral (Table's striped rows and header sit at 0.07–0.35), and it still lets the tint
//     through. Only fills are checked — a border or text colour does not cover a surface.
{
  /* Two opacity spellings, and the brackets are what tells them apart: `/[0.07]` is an arbitrary
     FRACTION, `/80` is a Tailwind PERCENT step, bare is fully opaque. The bracket must not be optional
     on the fraction branch or `/10` matches it and reads as alpha 10. */
  const FILL = /(?<![-\w])bg-(white|black)(?:\/(?:\[(\d?\.?\d+)\]|(\d+)))?(?![-\w])/g;
  /* Surfaces that are deliberately NOT theme surfaces. Keyed by file with the reason, so adding one
     means stating why rather than quietly widening the rule. */
  const NOT_A_THEME_SURFACE = new Map([
    ["components/open-in-v0-button.tsx", "v0's brand button — a third-party mark must not shift with our tint"],
    ["components/oklch-ramp-demo.tsx", "the 'copied' pill sits over arbitrary ramp swatches, so it needs its own contrast, not the theme's"],
  ]);
  for (const dir of ["components", "app"]) {
    for (const rel of readdirSync(join(root, dir), { recursive: true })) {
      if (typeof rel !== "string" || !/\.(tsx|ts)$/.test(rel)) continue;
      if (NOT_A_THEME_SURFACE.has(`${dir}/${rel}`)) continue;
      /* Scan the whole source with comments stripped, NOT just class-string positions. The obvious
         `(?:className=|cn\()\s*"([^"]*)"` shape only captures the FIRST argument of a cn() call, and
         the bug this invariant exists for lived in the fourth — so that shape would have watched the
         offending line go past and said nothing. `bg-white/80` is specific enough that the pattern is
         its own discriminator; comments have to go because the ones explaining this rule quote it. */
      const src = readFileSync(join(root, dir, rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      const seen = new Set();
      for (const hit of src.matchAll(FILL)) {
        /* `/[0.07]` is a fraction, `/80` is a percent, bare means fully opaque. */
        const alpha = hit[2] !== undefined ? Number(hit[2]) : hit[3] !== undefined ? Number(hit[3]) / 100 : 1;
        if (alpha < 0.5 || seen.has(hit[0])) continue;
        seen.add(hit[0]);
        fail(
          `[opaque-fill] ${dir}/${rel} uses "${hit[0]}" — a raw ${hit[1]} fill at alpha ${alpha} leaves only ` +
            `${Math.round((1 - alpha) * 100)}% of the tinted surface showing, so it reads flat in every theme. ` +
            `Point it at a role token (e.g. --active-bg for a selected control) or drop the alpha below 0.5.`,
        );
      }
    }
  }
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
  if (blocks.length === 0) continue; // selenite has no block — invariant 3 already flags missing blocks
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
