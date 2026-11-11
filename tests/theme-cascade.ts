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
 * numbers that has to be kept in step by hand. Anything it does not understand is an error rather than a
 * guess: an unknown function, a unit mismatch (min(58%, 35) is invalid CSS), or an undeclared var() with no
 * fallback.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** An element in the model: its classes and its attributes. */
export interface ModelElement {
  classes?: string[];
  attrs?: Record<string, string>;
}

interface Rule {
  selectors: string[];
  decls: Array<{
    name: string;
    value: string;
  }>;
  order: number;
}

// The suite runs from the repository root, as the other tests that read app/theme assume.
const ROOT = process.cwd();
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

/** Substitute every var() in `value` against `vars`, recursively. Throws on an unresolvable reference. */
function substitute(value: string, vars: Map<string, string>, seen: Set<string> = new Set()): string {
  const i = value.indexOf("var(");
  if (i === -1) return value;
  let depth = 0;
  let end = -1;
  for (let j = i + 3; j < value.length; j++) {
    if (value[j] === "(") depth++;
    else if (value[j] === ")" && --depth === 0) {
      end = j;
      break;
    }
  }
  const inner = value.slice(i + 4, end);
  const comma = (() => {
    let d = 0;
    for (let j = 0; j < inner.length; j++) {
      if (inner[j] === "(") d++;
      else if (inner[j] === ")") d--;
      else if (inner[j] === "," && d === 0) return j;
    }
    return -1;
  })();
  const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
  const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim();
  let replacement: string;
  if (vars.has(name) && !seen.has(name)) {
    replacement = substitute(
      vars.get(name) as string,
      vars,
      new Set([
        ...seen,
        name,
      ]),
    );
  } else if (fallback !== undefined) {
    replacement = substitute(fallback, vars, seen);
  } else {
    throw new Error(`theme-cascade: var(${name}) is not declared and has no fallback`);
  }
  return substitute(value.slice(0, i) + replacement + value.slice(end + 1), vars, seen);
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
  const own = new Map(inherited);
  for (const [name, w] of winners) own.set(name, w.value);
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

/* ── Math: numbers and percentages, + - * /, calc() / min() / max() ───────────────────────────── */
interface Num {
  v: number;
  pct: boolean;
}

function evaluate(expr: string): Num {
  const tokens = expr.match(/[\d.]+%?|[a-z-]+\(|[()*/+,-]/gi) ?? [];
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const same = (a: Num, b: Num, op: string) => {
    if (a.pct !== b.pct) throw new Error(`theme-cascade: ${op} mixes a percentage and a number in "${expr}"`);
  };
  function factor(): Num {
    const t = take();
    if (t === undefined) throw new Error(`theme-cascade: unexpected end of "${expr}"`);
    if (t === "-") {
      const f = factor();
      return {
        v: -f.v,
        pct: f.pct,
      };
    }
    if (t === "(") {
      const e = sum();
      if (take() !== ")") throw new Error(`theme-cascade: unbalanced "${expr}"`);
      return e;
    }
    if (/^[\d.]+%?$/.test(t))
      return {
        v: Number.parseFloat(t),
        pct: t.endsWith("%"),
      };
    const fn = t.toLowerCase();
    if (fn === "calc(") {
      const e = sum();
      if (take() !== ")") throw new Error(`theme-cascade: unbalanced calc() in "${expr}"`);
      return e;
    }
    if (fn === "min(" || fn === "max(") {
      const args = [
        sum(),
      ];
      while (peek() === ",") {
        take();
        args.push(sum());
      }
      if (take() !== ")") throw new Error(`theme-cascade: unbalanced ${fn}) in "${expr}"`);
      for (const a of args) same(args[0], a, fn);
      return {
        v: (fn === "min(" ? Math.min : Math.max)(...args.map((a) => a.v)),
        pct: args[0].pct,
      };
    }
    throw new Error(`theme-cascade: cannot evaluate "${t}" in "${expr}"`);
  }
  function product(): Num {
    let a = factor();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const b = factor();
      if (op === "*") {
        if (a.pct && b.pct) throw new Error(`theme-cascade: % * % in "${expr}"`);
        a = {
          v: a.v * b.v,
          pct: a.pct || b.pct,
        };
      } else {
        if (b.pct) throw new Error(`theme-cascade: division by a percentage in "${expr}"`);
        a = {
          v: a.v / b.v,
          pct: a.pct,
        };
      }
    }
    return a;
  }
  function sum(): Num {
    let a = product();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const b = product();
      same(a, b, op);
      a = {
        v: op === "+" ? a.v + b.v : a.v - b.v,
        pct: a.pct,
      };
    }
    return a;
  }
  const out = sum();
  if (pos !== tokens.length) throw new Error(`theme-cascade: trailing input in "${expr}"`);
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
 * The theme's token rules as plain CSS, for a jsdom <style>: every top-level rule whose selectors are all
 * :root / .dark / [data-glass-tint…] / [data-gloss…] (alone, compounded, or as a descendant), in source
 * order. jsdom cascades these onto <html>, so a component that reads leaf knobs through getComputedStyle
 * (AutoForeground) sees the shipped values for a preset and a mode rather than a hand-copied fixture.
 */
export function themeTokenCss(): string {
  const SCOPE = /^(?:(?::root|\.dark|\[data-glass-tint(?:="[a-z-]*")?\]|\[data-gloss(?:="[a-z-]*")?\])+\s*)+$/;
  return rules()
    .filter((r) => r.selectors.every((s) => SCOPE.test(s)))
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
