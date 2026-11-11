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
 *   4. [edge]  at NIGHT, the chrome edges (--border: dividers, outlines, every bare `border-border`; and
 *               --input, the default field's rim) clear the same floor on both surfaces. Deep night lifted
 *               them to L65 because at L30 / L25 they sat at or under the night surface and read as nothing.
 *               By day the edge stays the soft L85 line it was, deliberately under this floor (the light
 *               glass shadows' hairline defines the shape there), so day is reported, not asserted.
 *   5. [role]  at NIGHT, the other role tokens drawn against glass:
 *               - the focus ring (--ring) clears the same non-text floor on both surfaces;
 *               - the typed text inside a default field (--input at its night fill alpha, read from the
 *                 components) keeps the body floor plus margin;
 *               - each FILL (--accent, the hover; --secondary; --muted, the tabs well and the skeleton) sits
 *                 at least FILL_STEP L clear of both surfaces in OKLab lightness, ABOVE them wherever a lift
 *                 can still carry its text (below them only where none can: moonstone's pale floor), and the
 *                 text it carries keeps its floor plus margin (the strong ink on accent and secondary, the
 *                 muted tier on muted). Lightness, not APCA, for the step: APCA is a text model, it reads
 *                 anything under ~7.5 Lc as 0, and two large dark areas 8–14 L apart land there while
 *                 plainly distinct. FILL_STEP is above shadcn's own dark hover step (6.4 L, popover 0.205 →
 *                 accent 0.269), so a night fill reads at least as clearly as the reference design's.
 *
 * It models the surface the way components/auto-foreground.tsx does — glassSolidSurface() with the
 * solidify floor, then readableForeground() for the body band — so a change to that model shows up here
 * rather than only in production.
 *
 * Run: bun run test:contrast   (needs Node >= 22 to type-strip the imported .ts)
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  apcaContrast,
  boostBand,
  compositeSurface,
  deepen,
  dayBackingCap,
  dayWashCap,
  GLASS_SOLIDIFY_C_SCALE_DAY,
  limitingSurface,
  nightWashCap,
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
/* [edge]: the same non-text floor, for the chrome edges and the focus ring at night. */
const EDGE_FLOOR = INK_FLOOR;
/* [role]: how far a night fill sits from its surfaces (OKLab L), and the band its text is held to when
   it is the MUTED tier (AutoForeground's muted band: floor 60, target 72, ceiling 84). */
const FILL_STEP = 7;
const MUTED_BAND = { floor: 60, target: 72, ceiling: 84 };
/* The default field's night fill, `dark:bg-input/N`, read from the components that paint it so the check
   measures what ships. All three must agree. */
const INPUT_FILL_A = (() => {
  const alphas = ["input", "textarea", "input-group"].map((f) => /dark:bg-input\/(\d+)/.exec(read(`components/ui/${f}.tsx`))?.[1]);
  if (alphas.some((x) => x === undefined) || new Set(alphas).size !== 1) {
    console.error(`✗ contrast guard: the default field's night fill (dark:bg-input/N) is missing or differs across input / textarea / input-group: ${alphas}`);
    process.exit(1);
  }
  return Number(alphas[0]) / 100;
})();

/* ── The role-fill AUDIT: every --accent / --secondary / --muted fill in components/ui, and what it carries
   at night. Keyed "file class"; each value lists [fill, alpha, ink] for the pairings that class paints:
     accent-fg / secondary-fg — the fill's own -foreground (tokens.css decides which page tier that is);
     body — the page's body text (it inherits, or says text-foreground);
     muted — the muted tier (text-muted-foreground);
     chip / chip-strong — body / strong text on the selected-control chip (--active-bg) laid over the fill
       (an active tab);
     icon / icon-muted — an icon in the body / muted colour, held to the ui band floor;
     none — nothing on it (a separator, a skeleton, a handle, a dot): only its step from the surface counts.
   A class that paints at night under a dark: twin is listed as it renders then. The scan below fails if a
   component gains a fill this table does not list, or the table lists one that is gone, so it stays the
   truth about what each fill has to carry. */
const FILL_AUDIT = new Map(
  Object.entries({
    "accordion.tsx hover:bg-accent": [["accent", 1, "accent-fg"]], // default variant; dark:hover:text-accent-foreground
    "accordion.tsx hover:bg-muted/50": [["muted", 0.5, "body"]], // glass variant trigger hover
    "alert-dialog.tsx bg-muted": [["muted", 1, "icon"]], // AlertDialogMedia tile
    "badge.tsx [a&]:hover:bg-accent": [["accent", 1, "accent-fg"]],
    "button.tsx hover:bg-accent": [["accent", 1, "accent-fg"]], // ghost; at night dark:hover paints /50 over it
    "button.tsx dark:hover:bg-accent/50": [["accent", 0.5, "accent-fg"]],
    "button.tsx active:bg-accent/80": [["accent", 0.8, "accent-fg"]],
    "button.tsx dark:active:bg-accent/60": [["accent", 0.6, "accent-fg"]],
    "calendar.tsx bg-accent": [["accent", 1, "none"]], // range start/end cell, under the day's own primary fill
    "calendar.tsx aria-selected:bg-accent": [["accent", 1, "accent-fg"]],
    "calendar.tsx bg-accent/50": [["accent", 0.5, "accent-fg"]], // today
    "calendar.tsx data-[range-middle=true]:bg-accent": [["accent", 1, "accent-fg"]],
    "calendar.tsx dark:data-[range-middle=true]:bg-accent": [["accent", 1, "accent-fg"]], // the same, re-asserted over the night hover
    "calendar.tsx hover:bg-accent/50": [["accent", 0.5, "accent-fg"]], // a day under the cursor; the ghost Button's hover:text-accent-foreground (a selected day keeps its own, tests/night-state-collisions)
    "combobox.tsx data-highlighted:bg-accent": [["accent", 1, "accent-fg"]],
    "combobox.tsx bg-muted": [["muted", 1, "none"]], // separator
    "command.tsx aria-selected:bg-accent": [["accent", 1, "accent-fg"]],
    "command.tsx data-[selected=true]:bg-accent": [["accent", 1, "accent-fg"]],
    "context-menu.tsx focus:bg-accent": [["accent", 1, "accent-fg"]],
    "context-menu.tsx data-[state=open]:bg-accent": [["accent", 1, "accent-fg"]],
    "context-menu.tsx bg-muted": [["muted", 1, "none"]], // separator
    "dialog.tsx data-[state=open]:bg-accent": [["accent", 1, "icon-muted"]], // the close X
    "drawer.tsx bg-muted": [["muted", 1, "none"]], // handle
    "dropdown-menu.tsx focus:bg-accent": [["accent", 1, "accent-fg"]],
    "dropdown-menu.tsx data-[state=open]:bg-accent": [["accent", 1, "accent-fg"]],
    "dropdown-menu.tsx bg-muted": [["muted", 1, "none"]], // separator
    "item.tsx [a]:hover:bg-accent": [["accent", 1, "accent-fg"]], // link items; dark:[a]:hover:text-accent-foreground
    "menu-bar.tsx bg-accent": [["accent", 1, "accent-fg"]],
    "menubar.tsx hover:bg-accent": [["accent", 1, "accent-fg"]], // trigger; dark:hover:text-accent-foreground
    "menubar.tsx focus:bg-accent": [["accent", 1, "accent-fg"]],
    "menubar.tsx data-[state=open]:bg-accent": [["accent", 1, "accent-fg"]],
    "menubar.tsx bg-muted": [["muted", 1, "none"]], // separator
    "navigation-menu.tsx hover:bg-accent": [["accent", 1, "accent-fg"]],
    "navigation-menu.tsx focus:bg-accent": [["accent", 1, "accent-fg"]],
    "navigation-menu.tsx data-[active]:bg-accent/50": [["accent", 0.5, "accent-fg"]], // the current trigger; dark:data-[active]:text-accent-foreground
    "navigation-menu.tsx data-[state=open]:bg-accent/50": [["accent", 0.5, "accent-fg"]],
    "navigation-menu.tsx data-[state=open]:hover:bg-accent": [["accent", 1, "accent-fg"]],
    "navigation-menu.tsx data-[state=open]:focus:bg-accent": [["accent", 1, "accent-fg"]],
    "navigation-menu.tsx data-[active=true]:bg-accent/50": [["accent", 0.5, "accent-fg"]],
    "navigation-menu.tsx data-[active=true]:hover:bg-accent": [["accent", 1, "accent-fg"]],
    "navigation-menu.tsx data-[active=true]:focus:bg-accent": [["accent", 1, "accent-fg"]],
    "select.tsx focus:bg-accent": [["accent", 1, "accent-fg"]],
    "select.tsx bg-muted": [["muted", 1, "none"]], // separator
    "sheet.tsx data-[state=open]:bg-secondary": [["secondary", 1, "icon"]], // the close X
    "skeleton.tsx bg-muted": [["muted", 1, "none"]],
    "table.tsx [&_tbody_tr:nth-child(even):hover]:bg-muted/50": [["muted", 0.5, "body"]],
    "table.tsx bg-muted/50": [["muted", 0.5, "body"]], // footer
    "table.tsx hover:bg-muted/50": [["muted", 0.5, "body"]], // a row under the cursor
    "table.tsx has-aria-expanded:bg-muted/50": [["muted", 0.5, "body"]],
    "table.tsx data-[state=selected]:bg-muted": [["muted", 1, "body"]], // a selected row
    "tabs.tsx bg-muted": [
      ["muted", 1, "muted"], // the list's inactive triggers
      ["muted", 1, "chip-strong"], // the active trigger, strong at night (dark:data-[state=active]:text-foreground-strong)
    ],
    "toggle-group.tsx hover:bg-accent/50": [["accent", 0.5, "accent-fg"]],
    "toggle.tsx hover:bg-accent": [["accent", 1, "accent-fg"]],
    "toggle.tsx glass-hover-accent": [["accent", 0.7, "accent-fg"]], // --glass-hover-wash, the accent at 70%
  }),
);
/* The selected-control CHIP (--active-bg, a white lift at night) over the bare glass surface: the active
   tab of the glass list, the on-state of a toggle and of a toggle-group item. Not a role fill, but the
   same question (what does the text on it read), so it is audited the same way; fill "surface" means the
   chip sits straight on the ground. */
const CHIP_AUDIT = new Map(
  Object.entries({
    // Each says dark:…:text-foreground-strong, so the night text on the chip is the strong tier.
    "tabs.tsx data-[state=active]:bg-[var(--active-bg)]": [["surface", 1, "chip-strong"]],
    "toggle.tsx data-[state=on]:bg-[var(--active-bg)]": [["surface", 1, "chip-strong"]],
    "toggle-group.tsx data-[state=on]:bg-[var(--active-bg)]": [["surface", 1, "chip-strong"]],
  }),
);
/* The shadcn role contract, which holds whatever a component does: each fill carries its own text. */
const CONTRACT = [
  ["accent", 1, "accent-fg", "the shadcn contract"],
  ["secondary", 1, "secondary-fg", "the shadcn contract"],
  ["muted", 1, "muted", "the shadcn contract"],
];
const PAIRINGS = [
  ...CONTRACT,
  ...[...FILL_AUDIT, ...CHIP_AUDIT].flatMap(([where, list]) => list.filter(([, , kind]) => kind !== "none").map(([f, alpha, kind]) => [f, alpha, kind, where])),
];
const auditFailures = [];
{
  const found = new Set();
  const dir = "components/ui";
  for (const file of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".tsx"))) {
    const src = read(`${dir}/${file}`)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    for (const m of src.matchAll(/(?<=^|[\s"'`])([^\s"'`]*?(?:bg-(?:muted|secondary|accent)(?:\/\d+)?|glass-hover-accent|bg-\[var\(--active-bg\)\]))(?=[\s"'`]|$)/gm)) {
      found.add(`${file} ${m[1]}`);
    }
  }
  const audited = new Map([...FILL_AUDIT, ...CHIP_AUDIT]);
  for (const key of found) if (!audited.has(key)) auditFailures.push(`[role-audit] ${key} — a role fill the audit does not list. Add it to FILL_AUDIT / CHIP_AUDIT with the text it carries.`);
  for (const key of audited.keys()) if (!found.has(key)) auditFailures.push(`[role-audit] ${key} — listed in the audit but no longer in the component. Drop it.`);
}

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
      /* A knob written over another one: `var(--y)` or `calc(var(--y, d) * k)` (the pale warm stone keeps
         its backing's old scale and cap that way). Resolved per mode once the mode knobs are read. */
      rec.formulas ??= { light: [], dark: [] };
      for (const [, k, y, d, f] of body.matchAll(/--([a-z0-9-]+):\s*(?:calc\(\s*)?var\(--([a-z0-9-]+)(?:,\s*([\d.]+))?\)(?:\s*\*\s*([\d.]+)\s*\))?\s*;/g)) {
        rec.formulas[darkSel ? "dark" : "light"].push({ k, y, d: d === undefined ? undefined : +d, f: f === undefined ? 1 : +f });
      }
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
/** A token tokens.css's night rule declares at EVERY night scope, which outranks a preset's unscoped
 *  block: by day the preset's pin, else `day`; at night only the preset's own dark block, else `night`. */
const resolveDayPin = (p, mode, key, day, night) => (mode === "dark" ? (p.dark.get(key) ?? night) : (p.light.get(key) ?? day));

const vars = modeVars();
const all = presets();
/* The formula knobs, evaluated against what the preset (or the mode) resolves their operand to. By day only
   the unscoped block applies; at night the night rule outranks it for the knobs it declares, which
   resolveDayPin already honours by reading only the dark block there. */
for (const p of all) {
  for (const mode of ["light", "dark"]) {
    for (const { k, y, d, f } of p.formulas?.[mode] ?? []) {
      const v = resolve(p, mode, vars, y, d);
      if (v !== undefined) p[mode].set(k, v * f);
    }
  }
}

/** An `oklch(L C H)` literal to numbers (L as 0–1 or a percentage). */
const parseOklchLiteral = (s) => {
  const m = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(s ?? "");
  return m ? { l: m[2] ? +m[1] : +m[1] * 100, c: +m[3], h: +m[4] } : undefined;
};
/* The focus ring at night: a preset's own --ring (onyx sets one in its unscoped block, which outranks
   .dark's by source order), else the night token. */
const darkRing = parseOklchLiteral(/--ring:\s*(oklch\([^)]*\))/.exec(strip(css.tokens).slice(strip(css.tokens).indexOf(".dark {")))?.[1]);
const presetRings = new Map();
for (const src of [css.presets, css.frescoes]) {
  for (const [, darkSel, name, body] of strip(src).matchAll(/(\.dark)?\[data-glass-tint="([a-z]+)"\][^{]*\{([^}]*)\}/g)) {
    const ring = parseOklchLiteral(/--ring:\s*(oklch\([^)]*\))/.exec(body)?.[1]);
    if (ring && (darkSel || !presetRings.has(name))) presetRings.set(name, ring);
  }
}
const ringOf = (p) => presetRings.get(p.name) ?? darkRing;
/* Which page tier the night accent and secondary fills carry as text: --accent-foreground /
   --secondary-foreground in tokens.css's .dark block, var(--foreground-strong) or var(--foreground). */
const darkTokens = strip(css.tokens).slice(strip(css.tokens).indexOf(".dark {"));
/* (Token names keep their leading dashes here: a bare quoted "accent-…" is a Tailwind class candidate, and
   the site build scans this file.) */
const fillInk = (token) => /--foreground(-strong)?\)/.exec(new RegExp(`${token}:\\s*var\\(([^;]*);`).exec(darkTokens)?.[1] ?? "")?.[1] ? "strong" : "body";
if (!darkRing) {
  console.error("✗ contrast guard: could not read the night --ring from tokens.css — fix the parser");
  process.exit(1);
}
const failures = [...auditFailures];
const report = [];
const inkReport = [];
const edgeReport = [];
const roleReport = [];
const pairReport = [];

for (const p of all) {
  for (const mode of ["light", "dark"]) {
    const dark = mode === "dark";
    const h = resolve(p, mode, vars, "glass-tint-h");
    const c = resolve(p, mode, vars, "glass-tint-c");
    const a = resolve(p, mode, vars, "glass-tint-a");
    if (h === undefined || c === undefined || a === undefined) continue; // an incomplete scrape, not a preset

    /* Deep night: the wash paints at the darker of the preset's own lightness and --glass-night-depth
       (100 by day, 35 at night), under its chroma cap, which follows its own hue: at night 99.5% of the
       L35 sRGB ceiling (nightWashCap), by day the preset's own pin (95% of its ceiling at its own wash
       lightness) or, at the default L72, dayWashCap. tokens.css evaluates the fits per scope; the mirrors
       are held equal to the CSS by tests/deep-night.test.ts and tests/vibrant-day.test.ts. The same min
       and cap AutoForeground models. */
    const depth = resolve(p, mode, vars, "glass-night-depth", dark ? 35 : 100);
    const washL = deepen(resolve(p, mode, vars, "glass-wash-l", dark ? 58 : 72), depth);
    const washCMult = resolve(p, mode, vars, "glass-wash-c-mult", 2.5);
    const washCMax = resolveDayPin(p, mode, "glass-wash-c-max", dayWashCap(h), nightWashCap(h));
    const washC = Math.min(c * washCMult, washCMax);
    const opaqueL = resolve(p, mode, vars, "glass-opaque-l", dark ? 33.4 : 93);
    const cScale = resolve(p, mode, vars, "glass-opaque-c-scale", dark ? 0.98 : 0.85);
    /* A preset's --glass-opaque-c-max is its ceiling at the LIGHT floor; in dark, tokens.css's
       `.dark[data-glass-tint]` guard outranks it, so only a preset's own dark block can pin it there. */
    const cMax = dark
      ? (p.dark.get("glass-opaque-c-max") ?? vars.dark.get("glass-opaque-c-max") ?? 0.12)
      : resolve(p, mode, vars, "glass-opaque-c-max", 0.055);
    const solidA = vars[mode].get("glass-solid-a") ?? 0.65;

    /* The backing under sheer glass is --glass-solidify-*, its own surface since the split (tokens.css)
       — NOT --glass-opaque-*, which is what an opaque CARD paints. By day it sits at L92 with its own
       scale (×1.36) under a cap that follows the hue (92% of the L92 ceiling, dayBackingCap; the pale warm
       stone pins the flat one it had); at night tokens.css hands it the opaque floor's scale and cap. */
    const solidifyL = resolve(p, mode, vars, "glass-solidify-l", dark ? 36.4 : 92);
    const solidifyCScale = dark ? cScale : resolve(p, mode, vars, "glass-solidify-c-scale", GLASS_SOLIDIFY_C_SCALE_DAY);
    const solidifyCMax = resolveDayPin(p, mode, "glass-solidify-c-max", dayBackingCap(h), cMax);

    /* The same composition components/auto-foreground.tsx models: the veil/solid floor, the solidify
       layer (--glass-opacity, 0.7 fallback) over it, then the tint wash on top. */
    const surface = glassSolidSurface(dark, { h, c, a }, solidA, washL, washCMult, {
      l: solidifyL,
      c: Math.min(c * solidifyCScale, solidifyCMax),
      a: 0.7,
    }, resolve(p, mode, vars, "glass-solid-l", dark ? 18 : 99), washCMax);
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
    const fg = p.name === "onyx" ? readableTonal(textSurface, band, { hue: h, chroma: 0 }) : pickTonalInBand(ramp, textSurface, band);
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
    const opaqueSurface = compositeSurface({ l: opaqueL, c: Math.min(c * cScale, cMax * capScale), h }, [{ l: washL, c: washC, h, a }]);
    const opaqueBand = boostBand(READABLE_USAGE.body, 0, LC_AIM_KNOWN);
    const opaqueText = limitingSurface(opaqueSurface, stops);
    const opaqueInk = readableTonal(opaqueText, opaqueBand, { hue: opaqueSurface.h, chroma: RAMP_CHROMA });
    const opaqueLc = Math.abs(apcaContrast(opaqueInk, opaqueText));
    /* Lustre's paint order: page → adjustable backing → body → day tint wash → specular. */
    const lustreBodyA = resolve(p, mode, vars, "glass-lustre-a", 0.8);
    const lustreWashA = a * resolve(p, mode, vars, "glass-lustre-wash-strength", dark ? 0 : 1);
    const lustreSurface = compositeSurface({ l: dark ? 20 : 95, c: 0, h }, [
      { l: solidifyL, c: Math.min(c * solidifyCScale, solidifyCMax), h, a: 0.7 },
      {
        l: resolve(p, mode, vars, "glass-lustre-l", dark ? 22 : 93),
        c: Math.min(c * 1.4, resolve(p, mode, vars, "glass-lustre-c-max", dark ? 0.035 : 0.025)),
        h,
        a: lustreBodyA,
      },
      { l: washL, c: washC, h, a: lustreWashA },
      {
        l: resolve(p, mode, vars, "glass-lustre-gloss-l", dark ? 68 : 97),
        c: Math.min(c * 4.5, resolve(p, mode, vars, "glass-lustre-gloss-c-max", dark ? 0.1 : 0.013)),
        h,
        a: 0.21,
      },
    ]);
    const lustreText = limitingSurface(lustreSurface, stops);
    const lustreInk = readableTonal(lustreText, boostBand(READABLE_USAGE.body, LC_MARGIN * (1 - lustreBodyA) * (1 - lustreWashA) * 0.79 * 0.3), { hue: lustreSurface.h, chroma: c > 0 ? RAMP_CHROMA : 0 });
    const lustreLc = Math.abs(apcaContrast(lustreInk, lustreText));
    if (lustreLc < BODY_FLOOR + MARGIN) {
      failures.push(`[lustre] ${p.name} (${mode}) — body text reaches only ${lustreLc.toFixed(1)} Lc on its polished surface.`);
    }
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

    /* ── The night ROLE tokens drawn against glass ─────────────────────────────────────────────────
       Each is composed as engine.css composes it: oklch(<its L>, min(tint c, <its cap>), tint h), painted
       opaque over its element's own surface. Their night lightness lives in tokens.css's night token rule,
       which outranks a preset's unscoped block and is reset at every tint scope, so at night it resolves
       from the preset's own NIGHT block, then that rule (Onyx's day values never reach its night). Judged on
       the modelled surfaces, not at a fresco's hardest stop: an edge runs the whole perimeter and a fill
       spans its element. (The frescoes' night sheets are not the wash and do not go deep, so at their
       brightest corner an edge reads weaker.) */
    const roleL = (key, fb) => (dark ? (p.dark.get(key) ?? vars.dark.get(key)) : resolve(p, mode, vars, key)) ?? fb;
    const roleColor = (lKey, cKey, cFb) => ({ l: roleL(lKey) * 100, c: Math.min(c, resolve(p, mode, vars, cKey, cFb)), h });
    const grounds = [
      ["sheer", surface],
      ["opaque", opaqueSurface],
    ];
    /* [edge] the chrome edges: the border and the default field's rim. */
    for (const [token, lKey] of [
      ["border", "border-l"],
      ["input", "input-l"],
    ]) {
      const edge = roleColor(lKey, "border-c-max", dark ? 0.041 : 0.07);
      for (const [where, ground] of grounds) {
        const edgeLc = Math.abs(apcaContrast(edge, ground));
        edgeReport.push({ name: p.name, mode, where, token, lc: edgeLc, l: edge.l });
        if (dark && edgeLc < EDGE_FLOOR) {
          failures.push(
            `[edge] ${p.name} (night, ${where}) — --${token} (L${edge.l.toFixed(0)}) reaches only ${edgeLc.toFixed(1)} Lc against its L${ground.l.toFixed(1)} surface, under the ${EDGE_FLOOR} non-text floor. Raise its night --${lKey}.`,
          );
        }
      }
    }
    if (dark) {
      /* [role] the focus ring, a preset's own --ring if it sets one (onyx), else the night token. */
      const ring = ringOf(p);
      for (const [where, ground] of grounds) {
        const lcRing = Math.abs(apcaContrast(ring, ground));
        roleReport.push({ name: p.name, where, token: "ring", value: lcRing, unit: "Lc", l: ring.l });
        if (lcRing < EDGE_FLOOR) {
          failures.push(`[role] ${p.name} (night, ${where}) — the focus ring (L${ring.l.toFixed(0)}) reaches only ${lcRing.toFixed(1)} Lc on its L${ground.l.toFixed(1)} surface, under the ${EDGE_FLOOR} non-text floor.`);
        }
      }
      /* [role] the typed text inside a default field, whose night fill is the rim colour at INPUT_FILL_A. */
      const rim = roleColor("input-l", "border-c-max", 0.041);
      for (const [where, ground, ink] of [
        ["sheer", surface, fg],
        ["opaque", opaqueSurface, opaqueInk],
      ]) {
        const inside = compositeSurface(ground, [{ ...rim, a: INPUT_FILL_A }]);
        const lcIn = Math.abs(apcaContrast(ink, inside));
        roleReport.push({ name: p.name, where, token: "input text", value: lcIn, unit: "Lc", l: inside.l });
        if (lcIn < BODY_FLOOR + MARGIN) {
          failures.push(
            `[role] ${p.name} (night, ${where}) — body text inside a default field (--input at ${INPUT_FILL_A}) reaches only ${lcIn.toFixed(1)} Lc, under ${BODY_FLOOR + MARGIN}. Lower the field's night fill or its --input-l.`,
          );
        }
      }
      /* [role] the FILLS and the text they carry. Every pairing comes from FILL_AUDIT (the component audit:
         which fill, at what alpha, under which text tier) plus the shadcn role contract (accent and
         secondary carry their own -foreground, muted carries muted text), each composited over both
         surfaces at the alpha it is painted at. --accent-foreground / --secondary-foreground resolve from
         tokens.css to the page's STRONG tier (the small band, solved on the sheer surface: they resolve on
         <html>) or its body tier. */
      const boost = LC_MARGIN * showThrough(solidA, a, 0.7);
      const solve = (band) => (p.name === "onyx" ? readableTonal(textSurface, boostBand(band, boost), { hue: h, chroma: 0 }) : pickTonalInBand(ramp, textSurface, boostBand(band, boost)));
      const strong = solve(READABLE_USAGE.small);
      const mutedInk = solve(MUTED_BAND);
      const INKS = {
        "accent-fg": [fillInk("--accent-foreground") === "strong" ? strong : fg, BODY_FLOOR + MARGIN],
        "secondary-fg": [fillInk("--secondary-foreground") === "strong" ? strong : fg, BODY_FLOOR + MARGIN],
        body: [fg, BODY_FLOOR + MARGIN],
        chip: [fg, BODY_FLOOR + MARGIN],
        "chip-strong": [strong, BODY_FLOOR + MARGIN],
        muted: [mutedInk, MUTED_BAND.floor + MARGIN],
        icon: [fg, READABLE_USAGE.ui.floor],
        "icon-muted": [mutedInk, READABLE_USAGE.ui.floor],
      };
      const FILLS = {
        accent: roleColor("accent-bg-l", "accent-bg-c-max", 0),
        secondary: roleColor("secondary-l", "secondary-c-max", 0),
        muted: roleColor("muted-l", "muted-c-max", 0),
      };
      /* The selected-control chip (--active-bg) a tab paints over the muted list: white at --active-a. */
      const activeBg = { l: resolve(p, mode, vars, "active-l", 100), c: 0, h, a: resolve(p, mode, vars, "active-a", 0.2) };
      /** The surface a pairing's text sits on: the fill at its alpha over the ground (and the chip over that). */
      const isChip = (kind) => kind === "chip" || kind === "chip-strong";
      const under = (fillName, alpha, kind, ground) => {
        const s = fillName === "surface" ? ground : compositeSurface(ground, [{ ...FILLS[fillName], a: alpha }]);
        return isChip(kind) ? compositeSurface(s, [activeBg]) : s;
      };
      for (const [fillName, alpha, kind, where] of PAIRINGS) {
        const [ink, floor] = INKS[kind];
        for (const [side, ground] of grounds) {
          const lcPair = Math.abs(apcaContrast(ink, under(fillName, alpha, kind, ground)));
          pairReport.push({ name: p.name, side, fill: fillName, alpha, kind, where, lc: lcPair, floor });
          if (lcPair < floor) {
            failures.push(
              `[role] ${p.name} (night, ${side}) — ${kind} text on --${fillName} at ${alpha} (${where}) reaches only ${lcPair.toFixed(1)} Lc, under ${floor}. ` +
                `Move the night --${fillName === "accent" ? "accent-bg" : fillName}-l, or give that pairing a stronger tier.`,
            );
          }
        }
      }
      /* Each fill sits at least FILL_STEP clear of both surfaces: ABOVE them wherever a fill that far up still
         carries every pairing it has (at its alpha), BELOW them only where it cannot. */
      const top = Math.max(...grounds.map(([, g]) => g.l));
      for (const [fillName, lKey] of [
        ["accent", "accent-bg-l"],
        ["secondary", "secondary-l"],
        ["muted", "muted-l"],
      ]) {
        const fill = FILLS[fillName];
        const steps = grounds.map(([, g]) => fill.l - g.l);
        const lifted = { ...fill, l: top + FILL_STEP };
        const liftable = PAIRINGS.filter(([f]) => f === fillName).every(([, alpha, kind]) =>
          grounds.every(([, ground]) => {
            const [ink, floor] = INKS[kind];
            const s = compositeSurface(ground, [{ ...lifted, a: alpha }]);
            return Math.abs(apcaContrast(ink, isChip(kind) ? compositeSurface(s, [activeBg]) : s)) >= floor;
          }),
        );
        roleReport.push({ name: p.name, where: "both", token: fillName, value: Math.min(...steps.map(Math.abs)) * Math.sign(steps[0]), unit: "L", l: fill.l });
        const above = steps.every((d) => d >= FILL_STEP);
        const below = steps.every((d) => d <= -FILL_STEP);
        if (!(above || (below && !liftable))) {
          failures.push(
            `[role] ${p.name} (night) — --${fillName} (L${fill.l.toFixed(1)}) sits ${steps.map((d) => d.toFixed(1)).join(" / ")} L from its sheer / opaque surface: ` +
              (liftable
                ? `it must sit at least ${FILL_STEP} L ABOVE both (a lift there still carries every pairing).`
                : `it must sit at least ${FILL_STEP} L clear of both, on one side (night --${lKey}).`),
          );
        }
      }
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
  console.log("  edge (--border, --input over their surface):");
  for (const r of [...edgeReport].sort((x, y) => x.lc - y.lc)) {
    console.log(`  ${r.lc.toFixed(1)} Lc  ${r.name.padEnd(12)} ${r.mode.padEnd(6)} ${r.where.padEnd(6)} ${r.token} L${r.l.toFixed(0)}`);
  }
  console.log("  night fill pairings (the lowest Lc across presets and both surfaces, against its floor):");
  const byPair = new Map();
  for (const r of pairReport) {
    const k = `${r.where} | ${r.fill}${r.alpha < 1 ? ` at ${r.alpha}` : ""} | ${r.kind}`;
    const prev = byPair.get(k);
    if (!prev || r.lc < prev.lc) byPair.set(k, r);
  }
  for (const [k, r] of [...byPair].sort((x, y) => x[1].lc - y[1].lc)) console.log(`  ${r.lc.toFixed(1)} Lc (floor ${r.floor})  ${k}  [${r.name} ${r.side}]`);
  console.log("  night role tokens (ring / field text: Lc; fills: L from the nearer surface, and the Lc of their text):");
  for (const r of [...roleReport].sort((x, y) => x.token.localeCompare(y.token) || x.value - y.value)) {
    console.log(`  ${r.token.padEnd(10)} ${r.name.padEnd(12)} ${r.where.padEnd(6)} ${r.value.toFixed(1)} ${r.unit}  (L${r.l.toFixed(1)}${r.lcText !== undefined ? `, text ${r.lcText.toFixed(1)} Lc` : ""})`);
  }
}

/* Sanity floor: if the scrapers matched nothing the check is worthless. 16 jewels + moonstone +
   4 frescoes + 4 status + selenite + onyx = 27 named blocks, x2 modes. */
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
const edgeWorst = edgeReport.filter((r) => r.mode === "dark").reduce((a, b) => (b.lc < a.lc ? b : a));
const roleWorst = (token) => roleReport.filter((r) => r.token === token).reduce((a, b) => (Math.abs(b.value) < Math.abs(a.value) ? b : a));
const pairWorst = pairReport.reduce((a, b) => (b.lc - b.floor < a.lc - a.floor ? b : a));
console.log(
  `✓ preset contrast — ${scored.length} preset/mode pairs clear the ${BODY_FLOOR} Lc body floor ` +
    `(tightest ${worst.name} ${worst.mode} at ${worst.lc.toFixed(1)})` +
    (KNOWN.size ? `; ${KNOWN.size} pinned exception${KNOWN.size > 1 ? "s" : ""}: ${[...KNOWN.keys()].join(", ")}` : "") +
    `; ink border ≥ ${INK_FLOOR} Lc on ${inkReport.length} surfaces (tightest ${inkWorst.name} ${inkWorst.mode} ${inkWorst.where} at ${inkWorst.lc.toFixed(1)})` +
    `; night edge ≥ ${EDGE_FLOOR} Lc on ${edgeReport.filter((r) => r.mode === "dark").length} surfaces (tightest ${edgeWorst.name} ${edgeWorst.token} ${edgeWorst.where} at ${edgeWorst.lc.toFixed(1)})` +
    `; night roles: ring ≥ ${roleWorst("ring").value.toFixed(1)} Lc, field text ≥ ${roleWorst("input text").value.toFixed(1)} Lc, fills ≥ ${FILL_STEP} L clear (tightest ${["accent", "secondary", "muted"].map((t) => `${t} ${Math.abs(roleWorst(t).value).toFixed(1)}`).join(", ")})` +
    `; ${PAIRINGS.length} audited fill pairings hold their floors (closest: ${pairWorst.kind} on ${pairWorst.fill} in ${pairWorst.where}, ${pairWorst.lc.toFixed(1)} against ${pairWorst.floor})`,
);
