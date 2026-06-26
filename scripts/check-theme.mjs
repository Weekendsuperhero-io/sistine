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
 *   3. [preset] Every GlassTintSwitcher preset (except neutral) has a [data-glass-tint="x"] block.
 *   4. [status] Every status a component renders via data-glass-tint has a [data-glass-tint] block.
 *   5. [fresco] Every fresco preset (sets --glass-crystal-fresco) has a FRESCO_HUES entry.
 *   6. [variants] Every glass component (has a crystal: variant) also has surface: + solid: variants.
 *   7. [sync]   public/r/theme.json embeds the CURRENT app/globals.css (registry not stale).
 *
 * Run: pnpm test   (node scripts/check-theme.mjs)
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");

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

// 2b. [solid] --glass-solid-a must be composed on the ELEMENT (in @utility glass-solid), never in a
//     token context (:root/.dark/grouped) — else a scoped --glass-solid-a wouldn't resolve there.
for (const r of rules) {
  if (!(isBareRootOrDark(r.selector) || coversScopedTint(r.selector))) continue;
  for (const d of decls(r.body)) {
    if (/var\(--glass-solid-a\)/.test(d.value)) {
      fail(
        `[solid] ${d.name} composes var(--glass-solid-a) in "${r.selector}". ` +
          `Compose it in @utility glass-solid (resolves at the element) so a scoped --glass-solid-a works.`,
      );
    }
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
const huesStart = canvasUtils.indexOf("FRESCO_HUES");
const huesBlock = huesStart >= 0 ? canvasUtils.slice(huesStart, canvasUtils.indexOf("};", huesStart)) : "";
const frescoHues = new Set([...huesBlock.matchAll(/^\s+([a-z]+):\s*\[/gm)].map((m) => m[1]));
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

// 6. [variants] every glass component (defines a crystal: variant) also defines surface: + solid:,
//    so the four tier names (glass/surface/solid/opaque) are uniformly available on the variant prop.
for (const rel of componentFiles) {
  const src = readFileSync(join(root, "components", rel), "utf8");
  if (!/\bcrystal:\s*"glass-crystal/.test(src)) continue;
  for (const k of ["surface", "solid"]) {
    if (!new RegExp(`\\b${k}:\\s*"glass-${k}`).test(src)) {
      fail(`[variants] ${rel} has the glass variant set but no "${k}" variant (→ glass-${k}). Add it so glass/surface/solid/opaque are all available.`);
    }
  }
}

// 7. [sync] shipped theme.json embeds the current globals.css
try {
  const theme = JSON.parse(readFileSync(join(root, "public/r/theme.json"), "utf8"));
  const shipped = theme.files?.find((f) => f.path === "app/globals.css")?.content;
  if (shipped == null) fail(`[sync] public/r/theme.json has no app/globals.css file.`);
  else if (shipped !== css) fail(`[sync] public/r/theme.json's globals.css is STALE — run "pnpm registry:check" and commit public/r.`);
} catch (e) {
  fail(`[sync] could not read public/r/theme.json: ${e.message}`);
}

if (failures.length) {
  console.error(`✗ theme invariants: ${failures.length} failure(s)\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(
  `✓ theme invariants pass — ${rules.length} rules: scope-aware tints, fg isolation, ${presets.length} presets wired, ${statuses.size} component tints + ${frescoPresets.size} frescoes consistent, theme.json in sync`,
);
