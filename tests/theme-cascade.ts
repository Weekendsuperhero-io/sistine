/**
 * The theme's custom properties as a browser resolves them, read from the shipped partials.
 *
 * jsdom cascades custom properties from a stylesheet, but it neither substitutes var() nor evaluates the
 * math the engine composes (calc / min / max over numbers and percentages), so a composed token such as
 * --glass-tint-wash cannot be read back from it. This models the parts that decide those values: which
 * top-level rules MATCH an element carrying a class and a data-glass-tint (or a child of one), the cascade
 * between them (specificity, then source order in app/globals.css's import order), inheritance of computed
 * custom properties into a child (except those registered `inherits: false`), var() substitution with
 * fallbacks, and the math.
 *
 * It reads the CSS itself, so a test built on it measures what ships rather than a parallel table of
 * numbers that has to be kept in step by hand. var() substitution and the math are scripts/lib/css-math
 * (check-gamut evaluates the night wash cap with the same code); anything they do not understand is an
 * error rather than a guess.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compile, evaluate } from "../scripts/lib/css-math.mjs";

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
          /* Whitespace is collapsed and dropped just inside parentheses (the formatter breaks a long :is() or
             :not() over lines), which changes no selector's meaning. */
          selector = (src.slice(segStart, i).split(";").pop()?.trim() ?? "").replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
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

/** The custom properties the partials register `@property … { inherits: false }`: a child does not inherit
 *  them (the glow layer, the veil slots, the ink border, the status Alert's own surface slots). */
function loadNonInherited(): Set<string> {
  const aggregator = readFileSync(join(ROOT, "app/globals.css"), "utf8");
  const names = new Set<string>();
  for (const [, file] of aggregator.matchAll(/@import\s+"\.\/(theme\/[a-z-]+\.css)"/g)) {
    const src = stripComments(readFileSync(join(ROOT, "app", file), "utf8"));
    for (const [, name, body] of src.matchAll(/@property\s+(--[a-z0-9-]+)\s*\{([^}]*)\}/gi)) {
      if (/inherits:\s*false/.test(body)) names.add(name);
    }
  }
  return names;
}
let nonInheritedCache: Set<string> | undefined;
export const nonInherited = () => {
  nonInheritedCache ??= loadNonInherited();
  return nonInheritedCache;
};

/** Specificity of one COMPOUND selector against an element, or null if it does not match. `ancestors` is the
 *  chain down to and including the element, for a `:not()` whose argument is a complex selector. */
function matchCompound(
  compound: string,
  el: ModelElement,
  ancestors: ModelElement[] = [
    el,
  ],
  inNot = false,
): number | null {
  let spec = 0;
  let rest = compound;
  while (rest) {
    let m: RegExpExecArray | null;
    if ((m = /^\*/.exec(rest))) {
      // the universal selector: matches any element, no specificity
    } else if ((m = /^:not\((?=:where\()/.exec(rest))) {
      /* :not(:where(<selector list>)) matches if no argument does, at no specificity: the form the status Alert's
         day rule takes (presets.css). Every other :not() still falls through to "not modelled" below, as it
         always has, so no rule this model already read changes how it matches. */
      let depth = 0;
      let end = 0;
      for (let i = m[0].length - 1; i < rest.length; i++) {
        if (rest[i] === "(") depth++;
        else if (rest[i] === ")" && --depth === 0) {
          end = i;
          break;
        }
      }
      const args = splitTop(rest.slice(m[0].length, end), ",");
      if (args.some((a) => matchSelector(a, ancestors, true) !== null)) return null;
      spec += Math.max(0, ...args.map(argSpecificity));
      rest = rest.slice(end + 1);
      continue;
    } else if ((m = /^:root/.exec(rest))) {
      /* The top element only: `ancestors` is the chain down to this element, so it is the root when the chain is
         it alone. Read here, not from a selector's text, since a :not() argument can name an ancestor's :root
         (the day-page inverse's `:root[data-glass-tint="onyx"] *`) and :where(:root…) names this element's. */
      if (ancestors.length !== 1) return null;
      spec += 1;
    } else if ((m = /^\.([a-z0-9_-]+)/i.exec(rest))) {
      if (!el.classes?.includes(m[1])) return null;
      spec += 1;
    } else if ((m = /^\[([a-z0-9-]+)(?:="([^"]*)")?\]/i.exec(rest))) {
      const v = el.attrs?.[m[1]];
      if (v === undefined || (m[2] !== undefined && v !== m[2])) return null;
      spec += 1;
    } else if ((m = /^:is\(/.exec(rest))) {
      /* :is() matches if any (compound) argument does, and carries the specificity of its most specific
         argument, matched or not: the status Alert's day rule names the four status tints this way. */
      let depth = 0;
      let end = 0;
      for (let i = m[0].length - 1; i < rest.length; i++) {
        if (rest[i] === "(") depth++;
        else if (rest[i] === ")" && --depth === 0) {
          end = i;
          break;
        }
      }
      const args = splitTop(rest.slice(m[0].length, end), ",");
      if (!args.some((a) => !/\s/.test(a) && matchCompound(a, el, ancestors) !== null)) return null;
      spec += Math.max(0, ...args.map(argSpecificity));
      rest = rest.slice(end + 1);
      continue;
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
      // Inside a :not(), an argument may be complex (`.dark *`); elsewhere only compound arguments are read.
      if (
        !splitTop(inner, ",").some((s) =>
          inNot ? matchSelector(s, ancestors, true) !== null : !/\s/.test(s) && matchCompound(s, el, ancestors) !== null,
        )
      )
        return null;
      rest = rest.slice(end + 1);
      continue;
    } else return null; // a pseudo-class, element or anything else this model does not need
    rest = rest.slice(m[0].length);
  }
  return spec;
}

/** The specificity a selector carries regardless of what it matches (for :not()): ids are not used here, so
 *  classes, attributes and pseudo-classes outside :where() count one each. */
function argSpecificity(selector: string): number {
  const bare = selector.replace(/:where\((?:[^()]|\([^()]*\))*\)/g, "");
  return (bare.match(/\.[a-z0-9_-]+|\[[^\]]*\]|:(?!where)[a-z-]+/gi) ?? []).length;
}

/** Specificity of a selector against the LAST element of `chain`, or null. Only the descendant combinator. */
function matchSelector(selector: string, chain: ModelElement[], inNot = false): number | null {
  /* Split outside parentheses where it matters: a :not(:where(…)) argument can be complex (`.dark *`), and an :is()
     list holds a space after each comma (engine.css's block D names the scopes inside an inverse that way). Every
     other selector splits as it always did, so a top-level :where() list (styles.css's page-style remaps) stays
     outside the model, as tests/night-snapshot.test.ts recorded it. */
  const parts = inNot || selector.includes(":not(:where(") || selector.includes(":is(") ? splitTop(selector, /\s/) : selector.split(/\s+/);
  if (parts.some((p) => /^[>+~]$/.test(p))) return null;
  const subject = chain[chain.length - 1];
  const last = matchCompound(parts[parts.length - 1], subject, chain, inNot);
  if (last === null) return null;
  let spec = last;
  let at = chain.length - 2;
  for (let p = parts.length - 2; p >= 0; p--) {
    let found = false;
    for (; at >= 0; at--) {
      const s = matchCompound(parts[p], chain[at], chain.slice(0, at + 1), inNot);
      if (s !== null) {
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

/** The var() that opens at `start` in `value`: the name it references, its fallback, and where it closes. */
function parseVar(
  value: string,
  start: number,
): {
  name: string;
  fallback?: string;
  end: number;
} {
  let depth = 0;
  let end = -1;
  for (let j = start + 3; j < value.length; j++) {
    if (value[j] === "(") depth++;
    else if (value[j] === ")" && --depth === 0) {
      end = j;
      break;
    }
  }
  if (end === -1) throw new Error(`theme-cascade: unclosed var() in ${value}`);
  const inner = value.slice(start + 4, end);
  for (let j = 0, d = 0; j < inner.length; j++) {
    if (inner[j] === "(") d++;
    else if (inner[j] === ")") d--;
    else if (inner[j] === "," && d === 0)
      return {
        name: inner.slice(0, j).trim(),
        fallback: inner.slice(j + 1).trim(),
        end,
      };
  }
  return {
    name: inner.trim(),
    end,
  };
}

/* computedVars is a pure function of the chain (the partials are read once), and every nested scope recomputes
   its parents, so results are kept by the chain's shape: a section inside a page resolves the page once. */
const computedCache = new Map<string, Map<string, string>>();

/** The custom properties an element computes, inherited from its parent and cascaded from the theme. The
 *  returned map is shared between callers with the same chain: read it, never write to it. */
export function computedVars(chain: ModelElement[]): Map<string, string> {
  const key = JSON.stringify(chain);
  let vars = computedCache.get(key);
  if (!vars) {
    vars = resolveVars(chain);
    computedCache.set(key, vars);
  }
  return vars;
}

function resolveVars(chain: ModelElement[]): Map<string, string> {
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
  /* A property registered `inherits: false` starts from its initial value (none, for `syntax: "*"`) on every
     element: only what the element itself declares. */
  const own = new Map(
    [
      ...inherited,
    ].filter(([name]) => !nonInherited().has(name)),
  );
  for (const [name, w] of winners) {
    /* `inherit` takes the parent's computed value (already substituted); with no parent value the
       property is unset, as a custom property's initial value is. */
    if (w.value.trim() === "inherit") {
      const parent = inherited.get(name);
      if (parent === undefined) own.delete(name);
      else own.set(name, parent);
    } else if (w.value.trim() === "initial") {
      /* An unregistered custom property's initial value is the guaranteed-invalid value: how the theme's
         switches turn off ([data-gloss="tonal"], [data-gloss-shape="bevel"]). */
      own.delete(name);
    } else own.set(name, w.value);
  }
  /* An unresolvable declaration computes to the guaranteed-invalid value, and a var() that references it
     takes its fallback, as one that references an undeclared property does. The theme's switches depend
     on that (a flavor's or a shape's variant is invalid while its switch is off, and its readers fall back
     to the default), so the invalid ones are dropped from what the others substitute against, round by
     round, until every one left resolves. */
  const memo = new Map<string, string | null>();
  const resolve = (name: string, seen: Set<string>): string | null => {
    const known = memo.get(name);
    if (known !== undefined) return known;
    const raw = own.get(name);
    // Undeclared, or a cycle (every property in one is invalid at computed-value time).
    if (raw === undefined || seen.has(name)) return null;
    // An inherited value arrives already substituted, as a computed custom property does.
    const value = winners.has(name)
      ? substituteOrNull(
          raw,
          new Set([
            ...seen,
            name,
          ]),
        )
      : raw;
    memo.set(name, value);
    return value;
  };
  /** `value` with each var() replaced by what it references, or its fallback where that is invalid; null if
   *  a var() with no fallback references an invalid property. */
  const substituteOrNull = (value: string, seen: Set<string>): string | null => {
    let rest = value;
    let done = "";
    for (let i = rest.indexOf("var("); i !== -1; i = rest.indexOf("var(")) {
      const { name, fallback, end } = parseVar(rest, i);
      let replacement = resolve(name, seen);
      if (replacement === null && fallback !== undefined) replacement = substituteOrNull(fallback, seen);
      if (replacement === null) return null;
      done += rest.slice(0, i) + replacement;
      rest = rest.slice(end + 1);
    }
    return done + rest;
  };
  const out = new Map<string, string>();
  for (const name of own.keys()) {
    const value = resolve(name, new Set());
    if (value !== null) out.set(name, value);
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

/**
 * An `oklch(L C H / A)` value whose channels still hold placeholders (a scope resolved once with its hue or
 * chroma left as a name), compiled once per channel: the function evaluates it as evalOklch would the value
 * with the placeholders substituted, for a sweep over thousands of values.
 */
export function compileOklch(value: string, names: string[]): (vars: Record<string, number>) => ResolvedOklch {
  const body = value.trim().replace(/^oklch\(([\s\S]*)\)$/, "$1");
  const [channels, alpha] = splitTop(body, "/");
  const [l, c, h] = splitTop(channels, /\s/);
  if (h === undefined) throw new Error(`theme-cascade: "${value}" is not an L C H triple`);
  const [L, C, H] = [
    l,
    c,
    h,
  ].map((x) => compile(x, names));
  const A = alpha === undefined ? undefined : compile(alpha, names);
  return (vars) => {
    const lv = L(vars);
    return {
      l: lv.pct ? lv.v : lv.v * 100,
      c: C(vars).v,
      h: H(vars).v,
      a: A ? A(vars).v : 1,
    };
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
 * A theme token selector: :root / .dark / [data-glass-tint…] / [data-gloss…] / [data-gloss-shape…], alone, compounded, or as a
 * descendant. A compound is a run of those tokens, and compounds are separated by required whitespace, so
 * every selector has exactly one way to match. The earlier form put an optional space inside two nested
 * repeats, `(?:(?:…)+\s*)+`, which backtracks exponentially on a long run of tokens (code scanning).
 */
const SCOPE_TOKEN = String.raw`(?::root|\.dark|\[data-glass-tint(?:="[a-z-]*")?\]|\[data-gloss(?:-shape)?(?:="[a-z-]*")?\])`;
export const SCOPE_SELECTOR = new RegExp(String.raw`^${SCOPE_TOKEN}+(?:\s+${SCOPE_TOKEN}+)*\s*$`);

/* An inverse element (`data-mode="inverse"`, tests/mode-inverse.test.ts) is the model's to measure: a jsdom page here has
   none, so a scope selector's twin that stops at one reads as that selector, and a form that names one is left out,
   keeping each rule's own scope selectors in jsdom's sheet. */
const INVERSE_EXCLUDED = ':not(:where([data-mode="inverse"], [data-mode="inverse"] *))';
const withoutInverse = (s: string) => (s.endsWith(INVERSE_EXCLUDED) ? s.slice(0, -INVERSE_EXCLUDED.length) : s);

/**
 * The theme's token rules as plain CSS, for a jsdom <style>: every top-level rule whose selectors are all
 * :root / .dark / [data-glass-tint…] / [data-gloss…] (alone, compounded, or as a descendant), in source
 * order. jsdom cascades these onto <html>, so a component that reads leaf knobs through getComputedStyle
 * (AutoForeground) sees the shipped values for a preset and a mode rather than a hand-copied fixture.
 */
export function themeTokenCss(): string {
  return rules()
    .map((r) => ({
      ...r,
      selectors: r.selectors.map(withoutInverse).filter((s) => !s.includes('[data-mode="inverse"]')),
    }))
    .filter((r) => r.selectors.length > 0 && r.selectors.every((s) => SCOPE_SELECTOR.test(s)))
    .map((r) => `${r.selectors.join(",\n")} {\n${r.decls.map((d) => `  ${d.name}: ${d.value};`).join("\n")}\n}`)
    .join("\n");
}

/** The bare `[data-glass-tint="x"]` names in each rule's selector list, in source order. */
function presetBlocks(): string[][] {
  return rules()
    .map((r) => r.selectors.flatMap((s) => /^\[data-glass-tint="([a-z-]+)"\]$/.exec(s)?.[1] ?? []))
    .filter((names) => names.length > 0);
}

/** Every named [data-glass-tint="x"] preset the theme declares, in source order. A block names its preset
 *  first; a further name in the same selector list is an old id kept as an alias (presetAliases), as the
 *  check scripts read it. */
export function presetNames(): string[] {
  return [
    ...new Set(presetBlocks().map((names) => names[0])),
  ];
}

/** Every old preset id the theme still accepts, with the preset it now names: [alias, preset]. */
export function presetAliases(): Array<
  [
    string,
    string,
  ]
> {
  return presetBlocks().flatMap(([preset, ...aliases]) =>
    aliases.map(
      (alias) =>
        [
          alias,
          preset,
        ] as [
          string,
          string,
        ],
    ),
  );
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
