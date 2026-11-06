/**
 * Browser compatibility: every CSS feature Sistine ships, checked against the browsers it declares
 * (package.json `browserslist`) in MDN's browser-compat-data, the data Can I use draws on for CSS.
 *
 * WHAT IS READ, so nothing the library paints goes unchecked:
 *   - the site's stylesheet AS IT SHIPS: Tailwind's compiled output (the theme and every utility a
 *     component's classes produce), lowered by Lightning CSS for these same targets, as the build does.
 *     That is where Safari's -webkit- twins come from (the theme authors only the standard names, see
 *     the glass utility's backdrop-filter), so the check reads the twins the build adds;
 *   - the theme partials as written, for file:line on each finding (not judged on their own);
 *   - the CSS the components write at runtime: every pattern scene, rendered, its <style> blocks and its
 *     inline style attributes (Tailwind never sees these).
 * Per declaration it checks the property, the keywords the data tracks for it (text-wrap: balance), the
 * functions in the value (oklch(), color-mix(), cos(), gradients and their `in <space>` interpolation),
 * selectors (:has(), nesting, pseudo-elements), at-rules, and media features. Anything inside
 * @supports is skipped: a feature query guards it by design. Vendor-prefixed names are fallbacks and are
 * skipped too.
 *
 * WHAT IT CANNOT SEE: whether a browser draws a supported feature CORRECTLY. Safari 27.2 supports skewX
 * and tiled gradients and still painted aurora's tiled rays unskewed (see .au-paint); no compatibility data
 * records that. This is a floor under the visual checks, not a replacement for them.
 *
 * Fails on any feature a target lacks (or ships only behind a flag or prefix). Partial implementations
 * and unknowns are reported, not failed. On success it prints the features that SET the floor in each
 * browser, the list the README's browser-support table is drawn from.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import bcd from "@mdn/browser-compat-data";
import tailwind from "@tailwindcss/postcss";
import browserslist from "browserslist";
import { browserslistToTargets, transform } from "lightningcss";
import postcss, { type ChildNode, type Root } from "postcss";
import selectorParser from "postcss-selector-parser";
import valueParser from "postcss-value-parser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PATTERN_STYLES, PatternBackground } from "../components/pattern-background";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type Statement = {
  version_added: string | boolean | null;
  version_removed?: string | boolean | null;
  flags?: unknown[];
  prefix?: string;
  alternative_name?: string;
  partial_implementation?: boolean;
  notes?: string | string[];
};
type Compat = { support: Record<string, Statement | Statement[]> };
type Node = { __compat?: Compat } & { [key: string]: Node | Compat | undefined };
const css = bcd.css as unknown as Node;

/* ── Targets ────────────────────────────────────────────────────────────────────────────────────── */
const version = (v: string) => v.split(".").map(Number);
const cmp = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
};
const BROWSER: Record<string, string> = {
  safari: "safari",
  chrome: "chrome",
  firefox: "firefox",
  edge: "edge",
  ios_saf: "safari_ios",
  and_chr: "chrome_android",
  and_ff: "firefox_android",
};
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const targets = new Map<string, number[]>();
for (const entry of browserslist(pkg.browserslist)) {
  const [name, range] = entry.split(" ");
  const key = BROWSER[name];
  const v = version(range.split("-")[0]);
  if (!key || v.some(Number.isNaN)) continue;
  if (!targets.has(key) || cmp(v, targets.get(key)!) < 0) targets.set(key, v);
}
const shown = (v: number[]) => v.join(".");

/* ── Support ────────────────────────────────────────────────────────────────────────────────────── */
type Verdict = { browser: string; status: "ok" | "missing" | "partial" | "unknown"; added?: number[]; note?: string };
const covers = (s: Statement, min: number[]) => {
  const added = s.version_added;
  if (added === null || added === false || added === "preview") return false;
  const v = added === true ? [0] : version(String(added).replace("≤", ""));
  if (cmp(v, min) > 0) return false;
  return !(typeof s.version_removed === "string" && cmp(version(s.version_removed), min) <= 0);
};
/* MDN's notes are HTML (<code>, <a>); the report prints them as plain text. One regex pass over the tags
   can leave a tag behind (`<scr<b>ipt>` loses `<b>` and becomes `<script>`), which CodeQL flags as
   incomplete multi-character sanitization, so the tags come out in a loop until a pass removes nothing
   (CodeQL's own recommended fix), then any lone `<` or `>` goes. The notes come from the installed package
   and only ever reach the terminal, never a page, but the strip is complete either way. */
function plainText(html: string): string {
  let text = html;
  let previous: string;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, "");
  } while (text !== previous);
  return text.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

/* Supported if ANY statement covers the target: support that changed over time is several statements, the
   newest first (overscroll-behavior: full from Chrome 144, partial from 63). A prefixed statement counts
   only where the same rule also declares that prefixed name. */
function verdict(compat: Compat, browser: string, min: number[], prefixes: Set<string>): Verdict {
  const raw = compat.support[browser];
  if (!raw) return { browser, status: "unknown", note: "no data" };
  const all = (Array.isArray(raw) ? raw : [raw]).filter((s) => !s.flags && !s.alternative_name);
  const hit = all.find((s) => (!s.prefix || prefixes.has(s.prefix)) && covers(s, min));
  if (hit) {
    const added = hit.version_added === true ? [0] : version(String(hit.version_added).replace("≤", ""));
    if (hit.partial_implementation) return { browser, status: "partial", added, note: plainText([hit.notes ?? "partial"].flat()[0]) };
    return { browser, status: "ok", added };
  }
  const plain = all.find((s) => !s.prefix);
  if (!plain || plain.version_added === false) return { browser, status: "missing", note: plain ? "not supported" : "only behind a prefix not declared here" };
  if (plain.version_added === null) return { browser, status: "unknown", note: "version unknown" };
  if (plain.version_added === "preview") return { browser, status: "missing", note: "preview only" };
  return { browser, status: "missing", added: version(String(plain.version_added).replace("≤", "")) };
}

/* ── Feature collection ─────────────────────────────────────────────────────────────────────────── */
type Usage = { where: string; prefixes: Set<string> };
const used = new Map<string, { compat: Compat; usages: Usage[] }>();
/* Where each feature appears in the theme partials as written: locations for the report only. */
const authored = new Map<string, string[]>();
let collecting: "judge" | "locate" = "judge";
const NONE = new Set<string>();
function use(path: string[], where: string, prefixes: Set<string> = NONE) {
  let node: Node | undefined = css;
  for (const k of path) node = node?.[k] as Node | undefined;
  const compat = node?.__compat;
  if (!compat) return;
  const key = path.join(".");
  if (collecting === "locate") {
    const at = authored.get(key) ?? [];
    if (at.length < 3 && !at.includes(where)) at.push(where);
    authored.set(key, at);
    return;
  }
  const entry = used.get(key) ?? { compat, usages: [] };
  entry.usages.push({ where, prefixes });
  used.set(key, entry);
}

/* Function name → its entry under css.types (oklch → color.oklch, cos → cos, linear-gradient →
   gradient.linear-gradient). The shortest path wins where a name repeats. */
const FUNCTIONS = new Map<string, string[]>();
(function index(node: Node, path: string[]) {
  for (const [k, child] of Object.entries(node)) {
    if (k === "__compat" || !child || typeof child !== "object") continue;
    const at = [...path, k];
    const known = FUNCTIONS.get(k);
    if ((child as Node).__compat && (!known || known.length > at.length)) FUNCTIONS.set(k, at);
    index(child as Node, at);
  }
})(css.types as Node, ["types"]);

/* Tailwind's own directives: not CSS, compiled away before a browser sees them. */
const TAILWIND_AT = new Set(["tailwind", "theme", "utility", "variant", "custom-variant", "apply", "source", "plugin", "config", "reference"]);

const guarded = (node: ChildNode) => {
  for (let p = node.parent; p; p = p.parent as typeof p) if (p.type === "atrule" && (p as { name: string }).name === "supports") return true;
  return false;
};

function selectors(selector: string, where: string) {
  try {
    selectorParser((sel) => {
      sel.walk((n) => {
        if (n.type === "nesting") use(["selectors", "nesting"], where);
        if (n.type === "pseudo") {
          const name = n.value.replace(/^::?/, "").toLowerCase();
          if (!name.startsWith("-")) use(["selectors", name], where);
        }
      });
    }).processSync(selector);
  } catch {
    // Tailwind's source syntax that is not a selector yet; its compiled form is checked separately.
  }
}

function values(prop: string | null, value: string, where: string) {
  const parsed = valueParser(value);
  if (prop && prop !== "font-family") {
    // Keywords the data tracks for this property (text-wrap: balance, mask-composite: intersect). Not for a
    // font stack, which is a fallback list by design (ui-monospace, then SFMono-Regular, then …).
    parsed.walk((n) => {
      if (n.type === "word") use(["properties", prop, n.value.toLowerCase()], where);
    });
  }
  parsed.walk((n) => {
    if (n.type !== "function") return;
    const fn = n.value.toLowerCase();
    if (!fn || fn.startsWith("-")) return;
    const path = FUNCTIONS.get(fn);
    if (!path) return;
    use(path, where);
    if (fn.endsWith("gradient")) {
      // `in oklch` / `in oklab` (and a hue method) inside a gradient: tracked as their own subfeatures.
      const words = n.nodes.filter((c) => c.type === "word").map((c) => c.value.toLowerCase());
      if (words.includes("in")) use([...path, "interpolation_color_space"], where);
      if (words.includes("hue")) use([...path, "hue_interpolation_method"], where);
    }
  });
}

function scan(tree: Root, origin: (node: ChildNode) => string) {
  tree.walk((node) => {
    if (node.type === "comment" || guarded(node)) return;
    const where = origin(node);
    if (node.type === "atrule") {
      const name = node.name.toLowerCase();
      if (TAILWIND_AT.has(name)) return;
      use(["at-rules", name], where);
      if (name === "media") {
        for (const [, feature] of node.params.matchAll(/\(\s*([a-z-]+)\s*[:)<>=]/g)) use(["at-rules", "media", feature], where);
        if (/[<>]/.test(node.params)) use(["at-rules", "media", "range_syntax"], where);
      }
      if (name === "supports") use(["at-rules", "supports"], where);
    } else if (node.type === "rule") {
      selectors(node.selector, where);
    } else if (node.type === "decl") {
      const prop = node.prop.toLowerCase();
      const custom = prop.startsWith("--");
      if (!custom && !prop.startsWith("-")) {
        const twins = new Set<string>();
        node.parent?.each((sib) => {
          if (sib.type !== "decl") return;
          const m = sib.prop.toLowerCase().match(/^(-[a-z]+-)(.+)$/);
          if (m && m[2] === prop) twins.add(m[1]);
        });
        use(["properties", prop], where, twins);
      }
      values(custom || prop.startsWith("-") ? null : prop, node.value, where);
    }
  });
}

/* 1. The theme partials as written: where a finding can name its file and line. Not judged here: the
   build adds what a target needs (prefixes, lowered nesting), so the verdict is on the output below. */
collecting = "locate";
const sources = [
  "app/globals.css",
  "app/site.css",
  ...readdirSync(join(root, "app/theme"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => `app/theme/${f}`),
];
for (const file of sources) {
  const tree = postcss.parse(readFileSync(join(root, file), "utf8"), { from: join(root, file) });
  scan(tree, (node) => `${file}:${node.source?.start?.line ?? "?"}`);
}
collecting = "judge";

/* 2. Tailwind's compiled output for the site: the utilities every component's classes produce. */
const site = join(root, "app/site.css");
const compiled = await postcss([
  tailwind({
    base: root,
    optimize: false,
  }),
]).process(readFileSync(site, "utf8"), { from: site });
const shipped = transform({
  filename: "site.css",
  code: Buffer.from(compiled.css),
  targets: browserslistToTargets(browserslist(pkg.browserslist)),
  minify: false,
  errorRecovery: true,
});
scan(postcss.parse(shipped.code.toString()), (node) => `site CSS: ${node.type === "decl" ? `${(node.parent as { selector?: string })?.selector ?? "?"} { ${node.prop} }` : node.type === "rule" ? node.selector : `@${(node as { name: string }).name}`}`.slice(0, 140));

/* 3. The CSS the pattern scenes write at runtime, still and moving, by day and night (one stylesheet). */
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
for (const style of PATTERN_STYLES) {
  for (const speed of [
    0,
    8,
  ]) {
    const html = renderToStaticMarkup(
      createElement(PatternBackground, {
        style,
        speed,
      }),
    );
    for (const [, sheet] of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
      scan(postcss.parse(sheet), (node) => `scene ${style}: ${node.type === "rule" ? node.selector.slice(0, 60) : node.type === "decl" ? node.prop : ""}`);
    }
    for (const [, inline] of html.matchAll(/style="([^"]*)"/g)) {
      scan(postcss.parse(`x{${decode(inline)}}`), (node) => `scene ${style}: inline ${node.type === "decl" ? node.prop : ""}`);
    }
  }
}

/* ── Report ─────────────────────────────────────────────────────────────────────────────────────── */
/* Below the floor ON PURPOSE: each degrades to something correct where it is missing, and says what. A
   feature lands here by a decision recorded with its reason, never by default, so a new one still fails. */
const ENHANCEMENTS: Record<string, string> = {
  "properties.field-sizing": "Textarea grows with its content; without it the textarea keeps its rows and scrolls.",
  "properties.field-sizing.content": "As field-sizing.",
  "properties.scrollbar-color": "Theme-tinted scrollbars; without it the system scrollbar.",
  "properties.scrollbar-width": "Thin scrollbars; without it the system width.",
  "properties.scrollbar-width.thin": "As scrollbar-width.",
  "properties.text-wrap.pretty": "Balanced last lines; without it normal wrapping.",
  "properties.text-decoration.dotted":
    "Tailwind preflight's <abbr title> underline. The build writes -webkit-text-decoration beside it, which older Safari reads; the data tracks this keyword only unprefixed.",
};

const failures: string[] = [];
const enhancements: string[] = [];
const notes: string[] = [];
const floor = new Map<string, { v: number[]; features: string[] }>();
const at = (key: string, usages: Usage[]) =>
  [
    ...new Set([
      ...(authored.get(key) ?? []),
      ...usages.map((u) => u.where),
    ]),
  ]
    .slice(0, 3)
    .join("; ");
for (const [key, { compat, usages }] of [...used].sort(([a], [b]) => a.localeCompare(b))) {
  for (const [browser, min] of targets) {
    // The weakest usage decides: one rule without the prefixed twin is enough to fail.
    const verdicts = usages.map((u) => verdict(compat, browser, min, u.prefixes));
    const worst =
      verdicts.find((v) => v.status === "missing") ?? verdicts.find((v) => v.status === "unknown") ?? verdicts.find((v) => v.status === "partial") ?? verdicts[0];
    const line = `${key} — ${browser} ${shown(min)}: ${worst.added ? `needs ${shown(worst.added)}` : worst.note}`;
    if (worst.status === "missing") {
      const failing = usages.filter((u, i) => verdicts[i].status === "missing");
      if (ENHANCEMENTS[key]) enhancements.push(`${line}\n      ${ENHANCEMENTS[key]}`);
      else failures.push(`${line}\n      used at ${at(key, failing)}`);
    } else if (worst.status === "partial") {
      notes.push(`${key} — ${browser}: partial (${worst.note?.slice(0, 110)})`);
    } else if (worst.status === "unknown") {
      notes.push(`${key} — ${browser}: ${worst.note}`);
    }
    if (worst.added && (worst.status === "ok" || worst.status === "partial")) {
      const f = floor.get(browser);
      const c = f ? cmp(worst.added, f.v) : 1;
      if (c > 0) floor.set(browser, { v: worst.added, features: [key] });
      else if (c === 0 && f) f.features.push(key);
    }
  }
}

const against = [...targets].map(([b, v]) => `${b} ${shown(v)}`).join(", ");
const list = (items: string[]) => items.map((n) => `  - ${n}`).join("\n");
if (notes.length && process.argv.includes("--verbose")) console.log(`! browser compat notes (partial or unknown support, not failures):\n${list(notes)}`);
if (enhancements.length && process.argv.includes("--verbose")) console.log(`~ below the floor on purpose (degrade gracefully):\n${list(enhancements)}`);
if (failures.length) {
  console.error(`✗ browser compat: ${failures.length} feature/browser pair(s) below the declared floor (${against}):\n${list(failures)}`);
  process.exit(1);
}
const setBy = [...floor].map(([b, f]) => `${b} ${shown(f.v)} (${f.features.slice(0, 3).join(", ")}${f.features.length > 3 ? ", …" : ""})`).join("; ");
console.log(
  `✓ browser compat — ${used.size} CSS features clear ${against} (${enhancements.length} graceful enhancements, ${notes.length} partial/unknown notes; --verbose lists them). Floor set by: ${setBy}`,
);
