/**
 * The theme's custom properties as a browser resolves them, read from the shipped partials.
 *
 * jsdom cascades custom properties from a stylesheet, but it neither substitutes var() nor evaluates the
 * math the engine composes (calc / min / max over numbers and percentages), so a composed token such as
 * --glass-tint-wash cannot be read back from it. This models the parts that decide those values: which
 * top-level rules MATCH an element carrying a class and a data-glass-tint (or a child of one), the cascade
 * between them (specificity, then source order in app/globals.css's import order), inheritance of computed
 * custom properties into a child, var() substitution with fallbacks, and the math.
 *
 * It reads the CSS itself, so a test built on it measures what ships rather than a parallel table of
 * numbers that has to be kept in step by hand. var() substitution and the math are scripts/lib/css-math
 * (check-gamut evaluates the night wash cap with the same code); anything they do not understand is an
 * error rather than a guess.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluate, substitute } from "../scripts/lib/css-math.mjs";

/** An element in the model: its classes, its attributes and its inline custom properties. */
export interface ModelElement {
  classes?: string[];
  attrs?: Record<string, string>;
  /** Inline declarations (style="--x: …"), which outrank every rule. */
  style?: Record<string, string>;
}

interface Rule {
  selectors: string[];
  decls: Array<{
    name: string;
    value: string;
  }>;
  order: number;
}

// The suite runs from the repository root, as the other tests that read app/theme assume. THEME_ROOT points
// the model at another copy of the partials (an older tree, to take a before-snapshot from).
const ROOT = process.env.THEME_ROOT ?? process.cwd();
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** Split on top-level occurrences of `sep` (outside parentheses and brackets). */
function splitTop(s: string, sep: string | RegExp): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && (typeof sep === "string" ? ch === sep : sep.test(ch))) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/** Every top-level style rule in the theme, in cascade source order. At-rules are skipped. */
function loadRules(): Rule[] {
  const aggregator = readFileSync(join(ROOT, "app/globals.css"), "utf8");
  const files = [
    ...aggregator.matchAll(/@import\s+"\.\/(theme\/[a-z-]+\.css)"/g),
  ].map((m) => m[1]);
  if (files.length < 5) throw new Error("theme-cascade: could not read the partial order from app/globals.css");
  const rules: Rule[] = [];
  for (const file of files) {
    const src = stripComments(readFileSync(join(ROOT, "app", file), "utf8"));
    let depth = 0;
    let segStart = 0;
    let selector = "";
    let bodyStart = 0;
    for (let i = 0; i < src.length; i++) {
      if (src[i] === "{") {
        if (depth === 0) {
          // A statement at-rule (`@custom-variant …;`) can sit in front of the selector: keep what follows it.
          selector = src.slice(segStart, i).split(";").pop()?.trim() ?? "";
          bodyStart = i + 1;
        }
        depth++;
      } else if (src[i] === "}") {
        depth--;
        if (depth === 0) {
          if (!selector.startsWith("@")) {
            const body = src.slice(bodyStart, i);
            rules.push({
              selectors: splitTop(selector, ","),
              decls: [
                ...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi),
              ].map((m) => ({
                name: m[1],
                value: m[2].trim(),
              })),
              order: rules.length,
            });
          }
          segStart = i + 1;
        }
      }
    }
  }
  return rules;
}

let cached: Rule[] | undefined;
const rules = () => {
  cached ??= loadRules();
  return cached;
};

/** Specificity of one COMPOUND selector against an element, or null if it does not match. */
function matchCompound(compound: string, el: ModelElement): number | null {
  let spec = 0;
  let rest = compound;
  while (rest) {
    let m: RegExpExecArray | null;
    if ((m = /^:root/.exec(rest))) {
      spec += 1; // :root is only ever asked of the top element (see matchSelector)
    } else if ((m = /^\.([a-z0-9_-]+)/i.exec(rest))) {
      if (!el.classes?.includes(m[1])) return null;
      spec += 1;
    } else if ((m = /^\[([a-z0-9-]+)(?:="([^"]*)")?\]/i.exec(rest))) {
      const v = el.attrs?.[m[1]];
      if (v === undefined || (m[2] !== undefined && v !== m[2])) return null;
      spec += 1;
    } else if ((m = /^:where\(/.exec(rest))) {
      // :where() adds no specificity; it matches if any argument does.
      let depth = 0;
      let end = 0;
      for (let i = m[0].length - 1; i < rest.length; i++) {
        if (rest[i] === "(") depth++;
        else if (rest[i] === ")" && --depth === 0) {
          end = i;
          break;
        }
      }
      const inner = rest.slice(m[0].length, end);
      if (!splitTop(inner, ",").some((s) => !/\s/.test(s) && matchCompound(s, el) !== null)) return null;
      rest = rest.slice(end + 1);
      continue;
    } else return null; // a pseudo-class, element or anything else this model does not need
    rest = rest.slice(m[0].length);
  }
  return spec;
}

/** Specificity of a selector against the LAST element of `chain`, or null. Only the descendant combinator. */
function matchSelector(selector: string, chain: ModelElement[]): number | null {
  const parts = selector.split(/\s+/);
  if (parts.some((p) => /^[>+~]$/.test(p))) return null;
  const subject = chain[chain.length - 1];
  if (parts[parts.length - 1].includes(":root") && chain.length > 1) return null;
  const last = matchCompound(parts[parts.length - 1], subject);
  if (last === null) return null;
  let spec = last;
  let at = chain.length - 2;
  for (let p = parts.length - 2; p >= 0; p--) {
    let found = false;
    for (; at >= 0; at--) {
      const s = matchCompound(parts[p], chain[at]);
      if (s !== null && !(parts[p].includes(":root") && at !== 0)) {
        spec += s;
        found = true;
        at--;
        break;
      }
    }
    if (!found) return null;
  }
  return spec;
}

/** The custom properties an element computes, inherited from its parent and cascaded from the theme. */
export function computedVars(chain: ModelElement[]): Map<string, string> {
  const inherited = chain.length > 1 ? computedVars(chain.slice(0, -1)) : new Map<string, string>();
  const winners = new Map<
    string,
    {
      spec: number;
      order: number;
      value: string;
    }
  >();
  for (const rule of rules()) {
    let spec: number | null = null;
    for (const sel of rule.selectors) {
      const s = matchSelector(sel, chain);
      if (s !== null && (spec === null || s > spec)) spec = s;
    }
    if (spec === null) continue;
    for (const d of rule.decls) {
      const prev = winners.get(d.name);
      if (!prev || spec > prev.spec || (spec === prev.spec && rule.order >= prev.order)) {
        winners.set(d.name, {
          spec,
          order: rule.order,
          value: d.value,
        });
      }
    }
  }
  /* Declared values are substituted against THIS element's own values, which fall back to inherited ones;
     an inherited value arrives already substituted, as a computed custom property does. */
  const subject = chain[chain.length - 1];
  for (const [name, value] of Object.entries(subject.style ?? {})) {
    winners.set(name, {
      spec: Number.POSITIVE_INFINITY,
      order: Number.POSITIVE_INFINITY,
      value,
    });
  }
  const own = new Map(inherited);
  for (const [name, w] of winners) {
    /* `inherit` takes the parent's computed value (already substituted); with no parent value the
       property is unset, as a custom property's initial value is. */
    if (w.value.trim() === "inherit") {
      const parent = inherited.get(name);
      if (parent === undefined) own.delete(name);
      else own.set(name, parent);
    } else own.set(name, w.value);
  }
  const out = new Map<string, string>();
  for (const [name, raw] of own) {
    try {
      out.set(
        name,
        winners.has(name)
          ? substitute(
              raw,
              own,
              new Set([
                name,
              ]),
            )
          : raw,
      );
    } catch {
      // An unresolvable declaration computes to the guaranteed-invalid value: leave it out.
    }
  }
  return out;
}

/** An OKLCH colour as numbers: l 0–100, c, h in degrees, a 0–1. */
export interface ResolvedOklch {
  l: number;
  c: number;
  h: number;
  a: number;
}

/** Evaluate an `oklch(L C H / A)` value, or a bare `L C H` triple (the gloss ink), to numbers. */
export function evalOklch(value: string): ResolvedOklch {
  const body = value.trim().replace(/^oklch\(([\s\S]*)\)$/, "$1");
  const [channels, alpha] = splitTop(body, "/");
  const [l, c, h] = splitTop(channels, /\s/);
  if (h === undefined) throw new Error(`theme-cascade: "${value}" is not an L C H triple`);
  const L = evaluate(l);
  return {
    l: L.pct ? L.v : L.v * 100,
    c: evaluate(c).v,
    h: evaluate(h).v,
    a: alpha === undefined ? 1 : evaluate(alpha).v,
  };
}

/** A token's computed colour on the last element of `chain`. */
export function colorOf(name: string, chain: ModelElement[]): ResolvedOklch {
  const v = computedVars(chain).get(name);
  if (v === undefined) throw new Error(`theme-cascade: ${name} does not compute on this element`);
  return evalOklch(v);
}

/** A token's computed number on the last element of `chain` (a leaf knob, e.g. --glass-wash-l → 58). */
export function numberOf(name: string, chain: ModelElement[]): number {
  const v = computedVars(chain).get(name);
  if (v === undefined) throw new Error(`theme-cascade: ${name} does not compute on this element`);
  return evaluate(v).v;
}

/**
 * A theme token selector: :root / .dark / [data-glass-tint…] / [data-gloss…], alone, compounded, or as a
 * descendant. A compound is a run of those tokens, and compounds are separated by required whitespace, so
 * every selector has exactly one way to match. The earlier form put an optional space inside two nested
 * repeats, `(?:(?:…)+\s*)+`, which backtracks exponentially on a long run of tokens (code scanning).
 */
const SCOPE_TOKEN = String.raw`(?::root|\.dark|\[data-glass-tint(?:="[a-z-]*")?\]|\[data-gloss(?:="[a-z-]*")?\])`;
export const SCOPE_SELECTOR = new RegExp(String.raw`^${SCOPE_TOKEN}+(?:\s+${SCOPE_TOKEN}+)*\s*$`);

/**
 * The theme's token rules as plain CSS, for a jsdom <style>: every top-level rule whose selectors are all
 * :root / .dark / [data-glass-tint…] / [data-gloss…] (alone, compounded, or as a descendant), in source
 * order. jsdom cascades these onto <html>, so a component that reads leaf knobs through getComputedStyle
 * (AutoForeground) sees the shipped values for a preset and a mode rather than a hand-copied fixture.
 */
export function themeTokenCss(): string {
  return rules()
    .filter((r) => r.selectors.every((s) => SCOPE_SELECTOR.test(s)))
    .map((r) => `${r.selectors.join(",\n")} {\n${r.decls.map((d) => `  ${d.name}: ${d.value};`).join("\n")}\n}`)
    .join("\n");
}

/** Every named [data-glass-tint="x"] preset the theme declares, in source order. */
export function presetNames(): string[] {
  const names = new Set<string>();
  for (const r of rules()) {
    for (const s of r.selectors) {
      const m = /^\[data-glass-tint="([a-z-]+)"\]$/.exec(s);
      if (m) names.add(m[1]);
    }
  }
  return [
    ...names,
  ];
}

/** <html> in a page mode with an optional preset, as the model's element chain. */
export function html(dark: boolean, tint?: string): ModelElement[] {
  return [
    {
      classes: dark
        ? [
            "dark",
          ]
        : [],
      attrs:
        tint === undefined
          ? {}
          : {
              "data-glass-tint": tint,
            },
    },
  ];
}
