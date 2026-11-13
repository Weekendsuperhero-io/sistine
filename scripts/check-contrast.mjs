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
 *   6. [edge] / [role] / [rim] at NIGHT, each LINE also holds WCAG 1.4.11's 3:1 (a consumer measures real
 *               pixels by WCAG, and a lit line can clear 30 Lc at 2:1), on the plain surfaces AND each fresco
 *               stop composited over them (the lit night sheets lift the card under the line): the edges,
 *               the focus ring at the alpha the components draw it (RING_ALPHA, read from components/ui) and
 *               no fainter than by day, and the glass field's night rim (input.tsx's dark:glass-border-ink).
 *   7. [status] the Alert's words, its status ink token (read from alert.tsx), on the Alert's surface: 75 Lc
 *               plus margin and 4.5:1, both modes. At night that is the status tint; by day the Alert's own
 *               paler, solid surface (presets.css, ALERT_DAY), over a light and a dark scene.
 *   8. [scene]  body text on a sheer DAY card over a dark scene (the show-through the margin is for) holds the
 *               body floor, or is pinned at its measured value where unreachable (SCENE_KNOWN).
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
  oklchToSrgb,
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
import { ringTwins } from "./lib/ring-twins.mjs";

/* The /colors ramp defaults AutoForeground solves at. The clip bounds, margins, ramp build and pick all
   come from lib/oklch-utils now — this file used to re-declare them and had drifted. */
const RAMP_COUNT = 12;
const RAMP_CHROMA = 0.15;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

/* NaN-SAFE floors. A failure condition written `lc < floor` is false when lc is NaN (a token that resolves to
   nothing numeric, a model that breaks), so the check would pass silently. Each is written as the negation
   of its passing condition instead: below(x, floor) is true on NaN. */
const below = (x, floor) => !(x >= floor);
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
/* ── WCAG 2 beside APCA. APCA is the model this theme bands its text with, but the consumer (HERO) holds
   lines to WCAG 1.4.11's 3:1 and words to 4.5:1 on real pixels, and the two disagree exactly where night
   lines live: a lit line on a mid-dark surface can clear 30 Lc and still sit at 2:1. So a line is held to
   BOTH, and status words to both of theirs. */
const LINE_RATIO = 3; // WCAG 1.4.11, non-text contrast
const TEXT_RATIO = 4.5; // WCAG 1.4.3, body-size text
/** WCAG 2 relative luminance of an OKLCH colour, through the same sRGB encode the compositor uses. */
const wcagY = (col) => {
  const [r, g, b] = oklchToSrgb(col.l, col.c, col.h).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const wcagRatio = (x, y) => {
  const [hi, lo] = [wcagY(x), wcagY(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};
/* The day page under a SHEER card is not always the light page the model assumes: a dark scene shows
   through every alpha the card stacks (backdrop show-through), and darkens the surface the body ink was
   picked for. Modelled as the page lightness under the stack, at the darkest day scene a consumer ships
   (HERO's onboarding Aurora, mean Y 0.234 ≈ L61.6), less a margin for its darkest band. */
const DAY_DARK_SCENE_L = 52;

/* ── The FOCUS RING as the components draw it: `ring-ring/50` by day (a soft half-alpha halo) and, at night,
   the full-alpha `dark:…ring-ring` twin each one carries beside it, in the same class string
   (scripts/lib/ring-twins.mjs, per occurrence). Read from the components so the check measures the alpha
   that ships; an occurrence without its night twin draws the half-alpha ring at night too, and the night
   ring is scored at that alpha. */
const RING_ALPHA = (() => {
  const missing = [];
  for (const file of readdirSync(join(ROOT, "components/ui")).filter((f) => f.endsWith(".tsx"))) {
    for (const m of ringTwins(read(`components/ui/${file}`)).missing) missing.push(`${file} ${m}`);
  }
  return { day: 0.5, night: missing.length ? 0.5 : 1, missing };
})();
/* ── The INPUT ROLE's rim at night: the material's white glass edge (--glass-border at --glass-border-a), or
   the ink border (--foreground at --glass-border-ink-a) where input.tsx asks for it at night. */
const INPUT_NIGHT_INK = /(?<=^|[\s"'`])dark:glass-border-ink(?=[\s"'`])/m.test(read("components/ui/input.tsx"));
/* ── STATUS words: the Alert's text per status variant, which must be that status's INK token (a dark ink
   by day, a pale one at night, on the status tint), not the status colour itself (--destructive, a
   palette blue), which the border and icon keep. Read from alert.tsx. */
const ALERT_SRC = read("components/ui/alert.tsx");
const STATUS_TEXT = Object.fromEntries(
  ["info", "success", "warning", "destructive"].map((v) => {
    const line = new RegExp(`\\b${v}:\\s*\n?\\s*"([^"]*)"`).exec(ALERT_SRC)?.[1] ?? "";
    const token = /(?<=^|\s)text-([a-z0-9-]+)(?=\s|$)/.exec(line)?.[1];
    return [v, token];
  }),
);

/* ── The status ALERT's own DAY surface (presets.css, THE STATUS ALERT BY DAY: the four status tints' Alert,
   outside .dark and outside onyx): a solid near-white backing (--srf-solidify-l) and a film of it over the
   stack, so the shared wash shows at --srf-tint-a. Read from the rule so the check measures what ships; the
   backing's chroma is its day cap at that lightness (dayBackingCap tapers it toward white, as tokens.css and
   the rule's own formula do). */
const PRESETS_SRC = read("app/theme/presets.css").replace(/\/\*[\s\S]*?\*\//g, "");
const ALERT_DAY_RULE = /\[data-slot="alert"\]:is\(([^{]*?)\)\s*:not\(\s*:where\(([^{]*?)\)\s*\)\s*\{([^}]*)\}/.exec(PRESETS_SRC);
const ALERT_DAY = (() => {
  const body = ALERT_DAY_RULE?.[3];
  if (!body) return undefined;
  const num = (k) => Number(new RegExp(`--${k}:\\s*([0-9.]+)`).exec(body)?.[1]);
  return {
    solidifyL: num("srf-solidify-l"),
    tintA: num("srf-tint-a"),
    tints: [...ALERT_DAY_RULE[1].matchAll(/\[data-glass-tint="([a-z]+)"\]/g)].map((m) => m[1]),
    exceptOnyx: /\[data-glass-tint="onyx"\] \*/.test(ALERT_DAY_RULE[2]),
  };
})();
/* Onyx's own status inks (presets.css): onyx is dark in either mode, so its status Alerts keep the tint and
   read the pale inks it re-declares, by day too. */
const ONYX_BLOCK = /(?<![\w.\]-])\[data-glass-tint="onyx"\]\s*\{([^}]*)\}/.exec(PRESETS_SRC)?.[1] ?? "";

/* The default field's night fill, `dark:bg-input/(--input-fill-a)`, read from the components that paint it so
   the check measures what ships (all three must name the token), at each preset's own --input-fill-a (the
   night role rule's 10%, or the preset's night pin). */
const INPUT_FILL_TOKEN = (() => {
  const tokens = ["input", "textarea", "input-group"].map((f) => /dark:bg-input\/\(--([a-z0-9-]+)\)/.exec(read(`components/ui/${f}.tsx`))?.[1]);
  if (tokens.some((x) => x === undefined) || new Set(tokens).size !== 1) {
    console.error(`✗ contrast guard: the default field's night fill (dark:bg-input/(--token)) is missing or differs across input / textarea / input-group: ${tokens}`);
    process.exit(1);
  }
  return tokens[0];
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
/**
 * [scene] body text on a sheer DAY card over a dark scene: PINNED, not passed. AutoForeground's show-through
 * margin (LC_MARGIN, 12) aims the band's TARGET by LC_MARGIN × the backdrop's surviving weight, which on a
 * sheer day card is (1 − 0.65)(1 − a)(1 − 0.7) ≈ 0.09, so the margin buys about 1 Lc of aim there; and most
 * of these already pick the ramp's darkest TONAL step (L20, TONAL_MIN_L's clip), so no aim can take them
 * darker without dropping the hue for black. Raising the margin to 18 was measured to move them by 0.1–0.9
 * Lc and reverted (the owner's ruling, 2026-11-13: the card body stays as it is), so each is held at its
 * measured value at LC_MARGIN 12 so it cannot get worse, and a value that reaches the floor fails as stale.
 * What would fix them is a design call: a more opaque day card. The status ALERT's words are not here: by
 * day the Alert paints its own solid, paler surface (presets.css), so a dark scene no longer reaches them.
 */
const SCENE_KNOWN = new Map(
  Object.entries({
    amethyst: 72.3,
    aurora: 72.4,
    aventurine: 74.9,
    carnelian: 73.6,
    destructive: 70.7,
    gloaming: 70.9,
    goldstone: 71.4,
    info: 74.6,
    lapis: 72.9,
    moonstone: 73.4,
    muse: 72.8,
    rose: 71.8,
    sapphire: 74.1,
    sodalite: 74.5,
    success: 74.7,
    tanzanite: 73.9,
    tourmaline: 72.0,
    warning: 73.2,
  }),
);
/** A pinned measure: no worse than recorded (PIN_SLACK, the pins' own rounding to 0.1), and stale once it
 *  clears its floor. Every key it reads is remembered, so a pin no preset visits (a renamed or removed preset)
 *  fails rather than silently dropping out. */
const PIN_SLACK = 0.05;
const pinsVisited = new Set();
const holdPinned = (key, value, floor, failures, what) => {
  const pinned = SCENE_KNOWN.get(key);
  if (pinned === undefined) return false;
  pinsVisited.add(key);
  if (below(value, pinned - PIN_SLACK)) failures.push(`[known] ${what} got worse: ${value.toFixed(2)} Lc, pinned at ${pinned}.`);
  else if (value >= floor) failures.push(`[known] ${what} now reaches ${value.toFixed(1)} Lc, at its ${floor} floor: delete its SCENE_KNOWN entry (${key}).`);
  return true;
};

const css = {
  tokens: read("app/theme/tokens.css"),
  presets: read("app/theme/presets.css"),
  frescoes: read("app/theme/frescoes.css"),
  engine: read("app/theme/engine.css"),
};

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
/** A rule keyed on a component slot (the status Alert's day surface names the status tints in its selector)
 *  is not a preset block: drop it before the preset scrapers read the blocks. */
const withoutSlotRules = (s) => s.replace(/\[data-slot=[^{]*\{[^}]*\}/g, "");

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
  const dark = grab(darkBody);
  /* A night token read through a one-block preset's knob (`--border-l: var(--night-border-l, 0.65)`) is
     that fallback at a scope that sets no knob. */
  for (const { token, fallback } of nightKnobs().values()) dark.set(token, fallback);
  return { light: grab(rootBody), dark };
}

/** The night rule's KNOBS: knob name → the night token it sets and that token's shared value. A preset sets
 *  a knob in its one (unscoped) block, registered non-inheriting, so it holds at that scope only. */
function nightKnobs() {
  const t = strip(css.tokens);
  const out = new Map();
  for (const [, token, knob, fallback] of t.slice(t.indexOf(".dark {")).matchAll(/--([a-z0-9-]+):\s*var\(--(night-[a-z0-9-]+),\s*([\d.]+)\)\s*;/g)) {
    out.set(knob, { token, fallback: +fallback });
  }
  return out;
}

/** Every [data-glass-tint] block's declared numbers, split by mode scope. */
function presets() {
  const out = new Map();
  const knobs = nightKnobs();
  for (const src of [css.presets, css.frescoes]) {
    for (const [, darkSel, name, body] of withoutSlotRules(strip(src)).matchAll(/(\.dark)?\[data-glass-tint="([a-z]+)"\][^{]*\{([^}]*)\}/g)) {
      const rec = out.get(name) ?? { name, light: new Map(), dark: new Map(), fresco: { light: "", dark: "" } };
      const target = darkSel ? rec.dark : rec.light;
      for (const [, k, v] of body.matchAll(/--([a-z0-9-]+):\s*([\d.]+)%?\s*;/g)) target.set(k, +v);
      /* Its night knobs are night values, read by the night rule at this scope (a .dark block still wins). */
      if (!darkSel) for (const [knob, { token }] of knobs) if (target.has(knob) && !rec.dark.has(token)) rec.dark.set(token, target.get(knob));
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
  for (const [, darkSel, name, body] of withoutSlotRules(strip(src)).matchAll(/(\.dark)?\[data-glass-tint="([a-z]+)"\][^{]*\{([^}]*)\}/g)) {
    const ring = parseOklchLiteral(/--ring:\s*(oklch\([^)]*\))/.exec(body)?.[1]);
    if (ring && (darkSel || !presetRings.has(name))) presetRings.set(name, ring);
  }
}
const ringOf = (p) => presetRings.get(p.name) ?? darkRing;
/* The day ring, :root's --ring, for "at least as visible at night as by day". */
const dayRing = parseOklchLiteral(/--ring:\s*(oklch\([^)]*\))/.exec(strip(css.tokens).slice(0, strip(css.tokens).indexOf(".dark {")))?.[1]);
/** Each preset's day ring readings by ground, filled on the day pass and read on the night pass. */
const dayRingRatios = new Map();
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
if (RING_ALPHA.missing.length) {
  failures.push(
    `[ring-alpha] the focus ring is drawn at half alpha at night by ${RING_ALPHA.missing.length} class(es) with no full-alpha dark: twin beside them: ${RING_ALPHA.missing.join(", ")}`,
  );
}
const report = [];
const inkReport = [];
const edgeReport = [];
const roleReport = [];
const pairReport = [];
const sceneReport = [];
const statusReport = [];

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
    if (below(lustreLc, BODY_FLOOR + MARGIN)) {
      failures.push(`[lustre] ${p.name} (${mode}) — body text reaches only ${lustreLc.toFixed(1)} Lc on its polished surface.`);
    }
    /* Assert LIGHTNESS, not chroma. At L≈0 the shared gamut test is eps-tolerant and reports PHANTOM
       chroma — #000000 comes back carrying c 0.067 at the warm hues — so a chroma assertion silently
       passes the exact colour it is meant to catch (lib/oklch-utils documents this inside
       readableForeground's minChroma branch, which rejects it with a tighter eps). The clip bounds are
       the honest test: inside them the colour renders tinted, outside it does not. */
    if (c > 0 && !(opaqueInk.l >= TONAL_MIN_L && opaqueInk.l <= TONAL_MAX_L)) {
      failures.push(
        `[opaque] ${p.name} (${mode}) — --foreground-opaque solved to L${opaqueInk.l.toFixed(1)}, past the tonal clip ` +
          `(${TONAL_MIN_L}–${TONAL_MAX_L}), on an L${opaqueL} floor whose reach is ${opaqueLc.toFixed(1)} Lc. ` +
          `That is the achromatic extreme — the clip should have caught it.`,
      );
    } else if (below(opaqueLc, BODY_FLOOR)) {
      failures.push(
        `[opaque] ${p.name} (${mode}) — opaque-card body text reaches only ${opaqueLc.toFixed(1)} Lc on its L${opaqueL} floor, under the ${BODY_FLOOR} floor.`,
      );
    }

    /* [scene] BODY TEXT ON A SHEER DAY CARD OVER A DARK SCENE. The ink above was picked for the light page the
       model assumes; a dark scene behind the card shows through every alpha it stacks (veil, solidify, wash)
       and darkens the surface under the same ink. AutoForeground's show-through margin (LC_MARGIN, scaled by
       that surviving weight) is what has to cover it: the body floor has to hold on the scene-darkened
       surface too, at the fresco's hardest stop where there is one. By day only: at night the scene sits
       on the same side of mid-grey as the page, and only deepens a dark surface under light text. */
    if (!dark) {
      const sceneSurface = compositeSurface({ l: DAY_DARK_SCENE_L, c: 0, h }, [
        { l: resolve(p, mode, vars, "glass-solid-l", 99), c: 0, h, a: solidA },
        { l: solidifyL, c: Math.min(c * solidifyCScale, solidifyCMax), h, a: 0.7 },
        { l: washL, c: washC, h, a },
      ]);
      const sceneText = limitingSurface(sceneSurface, stops);
      const sceneLc = Math.abs(apcaContrast(fg, sceneText));
      sceneReport.push({ name: p.name, lc: sceneLc, l: sceneText.l, fgL: fg.l });
      if (!holdPinned(p.name, sceneLc, BODY_FLOOR, failures, `[scene] ${p.name} body text over a dark day scene`) && below(sceneLc, BODY_FLOOR)) {
        failures.push(
          `[scene] ${p.name} (day) — body text (L${fg.l.toFixed(1)}) on a sheer card over a dark scene (page L${DAY_DARK_SCENE_L}, surface L${sceneText.l.toFixed(1)}) reaches only ${sceneLc.toFixed(1)} Lc, under the ${BODY_FLOOR} floor. The show-through margin (LC_MARGIN ${LC_MARGIN}) does not cover it.`,
        );
      }
    }

    /* [status] THE ALERT'S WORDS on its own surface: the status ink token alert.tsx paints them with, held to
       the body floor plus margin (APCA 75 + MARGIN) and WCAG's 4.5:1, on the sheer and the opaque surface and,
       by day, over a dark scene too. */
    if (p.name in STATUS_TEXT) {
      const token = STATUS_TEXT[p.name];
      const body = dark ? darkTokens : strip(css.tokens).slice(0, strip(css.tokens).indexOf(".dark {"));
      const ink = token ? parseOklchLiteral(new RegExp(`--${token}:\\s*(oklch\\([^)]*\\))`).exec(body)?.[1]) : undefined;
      if (!ink) {
        failures.push(`[status] ${p.name} (${mode}) — the Alert's ${p.name} words are text-${token ?? "?"}, which is not a status ink token in tokens.css: they need a --${p.name}-ink pair (dark by day, pale at night) read against the status tint.`);
      } else {
        /* At night the Alert paints the status tint as every tinted surface does. By day it paints its own
           paler, firmer surface (ALERT_DAY), as `glass` composites it: its own solid backing, the shared wash
           (the tint's --glass-tint-a, untouched on the Alert), and a film of the backing over it at
           1 − --srf-tint-a / --glass-tint-a. Its backing is solid, so a dark scene behind it no longer shows
           through and the sheer, opaque-page and dark-scene grounds are the one surface. */
        const alertDay = (base) => {
          const backing = { l: ALERT_DAY.solidifyL, c: Math.min(c * solidifyCScale, dayBackingCap(h, ALERT_DAY.solidifyL)), h };
          return compositeSurface(base, [
            { ...backing, a: 1 },
            { l: washL, c: washC, h, a },
            { ...backing, a: Math.max(0, 1 - ALERT_DAY.tintA / a) },
          ]);
        };
        if (!dark && !ALERT_DAY) failures.push("[status] the Alert's day surface rule is missing from presets.css.");
        if (!dark && ALERT_DAY && (ALERT_DAY.tints.join() !== "info,success,warning,destructive" || !ALERT_DAY.exceptOnyx)) {
          failures.push(`[status] the Alert's day surface must name exactly the four status tints and skip onyx (it names ${ALERT_DAY.tints.join(", ")}${ALERT_DAY.exceptOnyx ? "" : ", and applies inside onyx"}).`);
        }
        /* A status Alert inside ONYX by day: onyx is dark in either mode, so the day surface rule does not apply
           there and the Alert paints the plain status tint over onyx's page knobs (its L18 backing, its dark
           veil), with onyx's own pale inks. Modelled as the status scope nested in an onyx page: the status
           block's knobs over onyx's, as they inherit. */
        const onyx = all.find((q) => q.name === "onyx");
        const onyxGrounds = [];
        let onyxInk;
        if (!dark && onyx) {
          onyxInk = parseOklchLiteral(new RegExp(`--${token}:\\s*(oklch\\([^)]*\\))`).exec(ONYX_BLOCK)?.[1]);
          const r = (key, fallback) => p.light.get(key) ?? onyx.light.get(key) ?? vars.light.get(key) ?? fallback;
          const oSolidifyL = r("glass-solidify-l", 92);
          /* Over the light page: the worst ground for a pale ink is the lightest one the backdrop can give. */
          const oSurface = glassSolidSurface(
            false,
            { h, c, a },
            r("glass-solid-a", 0.65),
            washL,
            washCMult,
            { l: oSolidifyL, c: Math.min(c * solidifyCScale, dayBackingCap(h, oSolidifyL)), a: 0.7 },
            r("glass-solid-l", 99),
            washCMax,
          );
          const oOpaque = compositeSurface({ l: r("glass-opaque-l", 93), c: Math.min(c * cScale, cMax * capScale), h }, [{ l: washL, c: washC, h, a }]);
          onyxGrounds.push(["sheer inside onyx", oSurface], ["opaque inside onyx", oOpaque]);
          if (!onyxInk) failures.push(`[status] onyx does not re-declare --${token}: its status Alerts are dark by day and need the pale night ink.`);
        }
        const statusGrounds = dark
          ? [
              ["sheer", surface],
              ["opaque", opaqueSurface],
            ]
          : !ALERT_DAY
            ? []
            : [
              ["sheer", alertDay({ l: 95, c: 0, h })],
              ["opaque", alertDay(opaqueSurface)],
              ["sheer over a dark scene", alertDay({ l: DAY_DARK_SCENE_L, c: 0, h })],
              ...(onyxInk ? onyxGrounds : []),
            ];
        for (const [where, ground] of statusGrounds) {
          const wordInk = where.endsWith("inside onyx") ? onyxInk : ink;
          const sLc = Math.abs(apcaContrast(wordInk, ground));
          const sRatio = wcagRatio(wordInk, ground);
          const lcFloor = BODY_FLOOR + MARGIN;
          statusReport.push({ name: p.name, mode, where, lc: sLc, ratio: sRatio, l: ground.l, token });
          if (below(sLc, lcFloor) || below(sRatio, TEXT_RATIO)) {
            failures.push(
              `[status] ${p.name} (${mode}, ${where}) — the Alert's words (--${token}, L${wordInk.l.toFixed(1)}) read ${sLc.toFixed(1)} Lc and ${sRatio.toFixed(2)}:1 on the L${ground.l.toFixed(1)} status tint, under ${lcFloor} Lc / ${TEXT_RATIO}:1.`,
            );
          }
        }
      }
    }

    /* The ink border: the same --foreground the surface's text uses, mixed toward transparent and painted
       over that surface (a border sits on its element's own background). color-mix(…, transparent) in
       oklch keeps the colour and scales its alpha, which the browser then blends in sRGB, as this does. */
    /* --brd-ink paints var(--glass-border-ink-a, var(--glass-border-ink-default-a, 0.5)): the consumer's override
       if the theme sets one (it does not), else the theme's default (a preset's night knob at night), else 0.5. */
    const inkA =
      resolve(p, mode, vars, "glass-border-ink-a") ??
      vars.light.get("glass-border-ink-a") ??
      resolve(p, mode, vars, "glass-border-ink-default-a") ??
      vars.light.get("glass-border-ink-default-a") ??
      0.5;
    for (const [where, ink, ground] of [
      ["sheer", fg, textSurface],
      ["opaque", opaqueInk, opaqueText],
    ]) {
      const line = compositeSurface(ground, [{ ...ink, a: inkA }]);
      const inkLc = Math.abs(apcaContrast(line, ground));
      if (below(inkLc, INK_FLOOR)) {
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
    /* The surfaces a LINE is judged on. A fresco paints its multi-hue sheet over every material, and its night
       stops (L74–86 at alpha 0.2–0.22) are not the wash and do not go deep, so the sheet LIFTS the surface
       under a line toward it: each stop composited over each surface is a ground too, and a line has to read
       at the brightest of them (moonstone's pale-stone night needs no sheet to be the hardest). */
    const lineGrounds = [...grounds, ...grounds.flatMap(([where, g]) => stops.map((st, i) => [`${where}+stop${i + 1}`, compositeSurface(g, [st])]))];
    /* [edge] the chrome edges: the border and the default field's rim. APCA's non-text floor AND, at night,
       WCAG 1.4.11's 3:1, which a lit line on the lighter-glass themes' night card misses while it still
       clears 30 Lc. */
    for (const [token, lKey] of [
      ["border", "border-l"],
      ["input", "input-l"],
    ]) {
      const edge = roleColor(lKey, "border-c-max", dark ? 0.041 : 0.07);
      for (const [where, ground] of dark ? lineGrounds : grounds) {
        const edgeLc = Math.abs(apcaContrast(edge, ground));
        const edgeRatio = wcagRatio(edge, ground);
        edgeReport.push({ name: p.name, mode, where, token, lc: edgeLc, ratio: edgeRatio, l: edge.l });
        if (dark && below(edgeLc, EDGE_FLOOR)) {
          failures.push(
            `[edge] ${p.name} (night, ${where}) — --${token} (L${edge.l.toFixed(0)}) reaches only ${edgeLc.toFixed(1)} Lc against its L${ground.l.toFixed(1)} surface, under the ${EDGE_FLOOR} non-text floor. Raise its night --${lKey}.`,
          );
        }
        if (dark && below(edgeRatio, LINE_RATIO)) {
          failures.push(
            `[edge] ${p.name} (night, ${where}) — --${token} (L${edge.l.toFixed(0)}) reaches only ${edgeRatio.toFixed(2)}:1 against its L${ground.l.toFixed(1)} surface, under WCAG's ${LINE_RATIO}:1 for a line. Raise its night --${lKey}.`,
          );
        }
      }
    }
    /* The focus ring as drawn: the role ring at the alpha the components paint it (RING_ALPHA), over the
       surface beside it. By day it is recorded for the night comparison below. */
    const ringNow = dark ? ringOf(p) : (presetRings.get(p.name) ?? dayRing);
    const ringA = dark ? RING_ALPHA.night : RING_ALPHA.day;
    const ringRatios = new Map();
    for (const [where, ground] of dark ? lineGrounds : grounds) {
      const drawn = compositeSurface(ground, [{ ...ringNow, a: ringA }]);
      ringRatios.set(where, { ratio: wcagRatio(drawn, ground), lc: Math.abs(apcaContrast(drawn, ground)), l: ground.l });
    }
    if (!dark) dayRingRatios.set(p.name, ringRatios);
    /* The INPUT ROLE's rim (the glass field), at night: the white glass edge at --glass-border-a, or the ink
       border where input.tsx asks for it at night. Held to 3:1 on every line ground. */
    if (dark) {
      const borderA = vars.dark.get("glass-border-a") ?? 0.15;
      for (const [where, ground] of lineGrounds) {
        const ink = where.startsWith("opaque") ? opaqueInk : fg;
        const rim = INPUT_NIGHT_INK ? { ...ink, a: inkA } : { l: 100, c: Math.min(c, 0.025) * 0.5, h, a: borderA };
        const drawn = compositeSurface(ground, [rim]);
        const rimRatio = wcagRatio(drawn, ground);
        roleReport.push({ name: p.name, where, token: "input rim", value: rimRatio, unit: ":1", l: ground.l });
        if (below(rimRatio, LINE_RATIO)) {
          failures.push(
            `[rim] ${p.name} (night, ${where}) — the glass field's rim (${INPUT_NIGHT_INK ? `ink at ${inkA}` : `white glass edge at ${borderA}`}) reaches only ${rimRatio.toFixed(2)}:1 on its L${ground.l.toFixed(1)} surface, under WCAG's ${LINE_RATIO}:1.`,
          );
        }
      }
    }
    if (dark) {
      /* [role] the focus ring, a preset's own --ring if it sets one (onyx), else the night token, drawn at the
         alpha the components paint it at night: APCA's non-text floor, WCAG's 3:1, and at least as visible
         as the same ring by day on the same kind of surface. */
      const ring = ringOf(p);
      const dayRatios = dayRingRatios.get(p.name);
      for (const [where, { ratio: rr, lc: lcRing, l: gl }] of ringRatios) {
        roleReport.push({ name: p.name, where, token: "ring", value: lcRing, unit: "Lc", l: ring.l });
        roleReport.push({ name: p.name, where, token: "ring ratio", value: rr, unit: ":1", l: ring.l });
        if (below(lcRing, EDGE_FLOOR)) {
          failures.push(`[role] ${p.name} (night, ${where}) — the focus ring (L${ring.l.toFixed(0)} at ${ringA}) reaches only ${lcRing.toFixed(1)} Lc on its L${gl.toFixed(1)} surface, under the ${EDGE_FLOOR} non-text floor.`);
        }
        if (below(rr, LINE_RATIO)) {
          failures.push(`[role] ${p.name} (night, ${where}) — the focus ring (L${ring.l.toFixed(0)} at ${ringA}) reaches only ${rr.toFixed(2)}:1 on its L${gl.toFixed(1)} surface, under WCAG's ${LINE_RATIO}:1.`);
        }
        const day = dayRatios?.get(where.split("+")[0]);
        if (day && below(rr, day.ratio)) {
          failures.push(`[role] ${p.name} (night, ${where}) — the focus ring reads ${rr.toFixed(2)}:1 at night, less than ${day.ratio.toFixed(2)}:1 by day: a night line must be at least as visible as by day.`);
        }
      }
      /* [role] the typed text inside a default field, whose night fill is the rim colour at --input-fill-a. */
      const rim = roleColor("input-l", "border-c-max", 0.041);
      const fillA = resolve(p, mode, vars, INPUT_FILL_TOKEN) / 100;
      for (const [where, ground, ink] of [
        ["sheer", surface, fg],
        ["opaque", opaqueSurface, opaqueInk],
      ]) {
        const inside = compositeSurface(ground, [{ ...rim, a: fillA }]);
        const lcIn = Math.abs(apcaContrast(ink, inside));
        roleReport.push({ name: p.name, where, token: "input text", value: lcIn, unit: "Lc", l: inside.l });
        if (below(lcIn, BODY_FLOOR + MARGIN)) {
          failures.push(
            `[role] ${p.name} (night, ${where}) — body text inside a default field (--input at ${fillA}) reaches only ${lcIn.toFixed(1)} Lc, under ${BODY_FLOOR + MARGIN}. Lower the field's night fill or its --input-l.`,
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
          if (below(lcPair, floor)) {
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
      if (below(lc, known.lc - 0.5)) {
        failures.push(
          `[known] ${p.name} (${mode}) — a pinned exception got worse: ${lc.toFixed(1)} Lc, was ${known.lc}. ` + `Reason on file: ${known.why}.`,
        );
      } else if (lc >= BODY_FLOOR + MARGIN) {
        failures.push(`[known] ${p.name} (${mode}) — now clears the floor at ${lc.toFixed(1)} Lc. Delete its KNOWN entry; the exception is stale.`);
      }
      continue;
    }

    if (below(worstLc, BODY_FLOOR)) {
      failures.push(
        `[body] ${p.name} (${mode}) — body text reaches only ${worstLc.toFixed(1)} Lc on its own surface${stops.length ? " at its fresco's hardest stop" : ""}, under the ${BODY_FLOOR} floor. ` +
          `Surface L${surface.l.toFixed(1)} from wash L${washL} at alpha ${a}. Alpha slides the surface toward the wash: ` +
          `lower it, or move --glass-wash-l closer to this mode's floor.`,
      );
    } else if (below(lc, BODY_FLOOR + MARGIN)) {
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
  console.log("  status words (Alert ink on its status tint):");
  for (const r of [...statusReport].sort((x, y) => x.lc - y.lc)) console.log(`  ${r.lc.toFixed(1)} Lc ${r.ratio.toFixed(2)}:1  ${r.name.padEnd(12)} ${r.mode.padEnd(6)} ${r.where} (L${r.l.toFixed(1)}, --${r.token})`);
  console.log(`  body over a dark day scene (page L${DAY_DARK_SCENE_L}):`);
  for (const r of [...sceneReport].sort((x, y) => x.lc - y.lc)) console.log(`  ${r.lc.toFixed(1)} Lc  ${r.name.padEnd(12)} surface L${r.l.toFixed(1)} ink L${r.fgL.toFixed(1)}`);
  console.log("  night lines, WCAG (edges; ring as drawn; input rim):");
  for (const r of [...edgeReport].filter((x) => x.mode === "dark").sort((x, y) => x.ratio - y.ratio).slice(0, 40)) console.log(`  ${r.ratio.toFixed(2)}:1 ${r.lc.toFixed(1)} Lc  ${r.name.padEnd(12)} ${r.where.padEnd(14)} ${r.token} L${r.l.toFixed(0)}`);
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
/* A SCENE_KNOWN pin no preset visited: a renamed or removed preset must not take its pin out silently. */
for (const key of SCENE_KNOWN.keys()) {
  if (!pinsVisited.has(key)) failures.push(`[known] SCENE_KNOWN pins "${key}", which no preset measured: rename or delete the pin.`);
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
    `; night lines ≥ ${LINE_RATIO}:1 (edges, the ring at alpha ${RING_ALPHA.night}, the glass field's rim), status words ≥ ${BODY_FLOOR} Lc / ${TEXT_RATIO}:1 on ${statusReport.length} surfaces` +
    `; ${SCENE_KNOWN.size} dark-day-scene measures pinned (SCENE_KNOWN)` +
    `; ${PAIRINGS.length} audited fill pairings hold their floors (closest: ${pairWorst.kind} on ${pairWorst.fill} in ${pairWorst.where}, ${pairWorst.lc.toFixed(1)} against ${pairWorst.floor})`,
);
