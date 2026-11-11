/**
 * The two pieces of CSS value computation the theme's checks need and nothing in the toolchain exposes:
 * var() substitution and the math the engine composes.
 *
 * Shared by tests/theme-cascade.ts (the cascade model the deep-night tests measure the theme with) and
 * scripts/check-gamut.mjs (which sweeps the night wash cap, a hue-dependent expression, across the hue
 * circle). jsdom cascades custom properties but evaluates neither, and the browser is not in the loop.
 *
 * Deliberately strict: an unknown function, a unit mismatch (min(58%, 35) is invalid CSS) or an undeclared
 * var() with no fallback is an error, never a guess. Numbers and percentages only, + - * /, calc(), min()
 * and max(): the whole vocabulary the colour tokens use.
 */

/**
 * Substitute every var() in `value` against `vars`, recursively, as the browser computes a custom property.
 * @param {string} value
 * @param {Map<string, string>} vars
 * @param {Set<string>} [seen] names already being substituted (a cycle is unresolvable)
 * @returns {string}
 */
export function substitute(value, vars, seen = new Set()) {
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
  let comma = -1;
  for (let j = 0, d = 0; j < inner.length; j++) {
    if (inner[j] === "(") d++;
    else if (inner[j] === ")") d--;
    else if (inner[j] === "," && d === 0) {
      comma = j;
      break;
    }
  }
  const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
  const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim();
  let replacement;
  if (vars.has(name) && !seen.has(name)) {
    replacement = substitute(/** @type {string} */ (vars.get(name)), vars, new Set([...seen, name]));
  } else if (fallback !== undefined) {
    replacement = substitute(fallback, vars, seen);
  } else {
    throw new Error(`css-math: var(${name}) is not declared and has no fallback`);
  }
  return substitute(value.slice(0, i) + replacement + value.slice(end + 1), vars, seen);
}

/**
 * Evaluate a substituted CSS math expression to a number, remembering whether it is a percentage.
 * @param {string} expr
 * @returns {{ v: number, pct: boolean }}
 */
export function evaluate(expr) {
  const tokens = expr.match(/[\d.]+%?|[a-z-]+\(|[()*/+,-]/gi) ?? [];
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  /** @param {{ pct: boolean }} a @param {{ pct: boolean }} b @param {string} op */
  const same = (a, b, op) => {
    if (a.pct !== b.pct) throw new Error(`css-math: ${op} mixes a percentage and a number in "${expr}"`);
  };
  /** @returns {{ v: number, pct: boolean }} */
  function factor() {
    const t = take();
    if (t === undefined) throw new Error(`css-math: unexpected end of "${expr}"`);
    if (t === "-") {
      const f = factor();
      return { v: -f.v, pct: f.pct };
    }
    if (t === "(") {
      const e = sum();
      if (take() !== ")") throw new Error(`css-math: unbalanced "${expr}"`);
      return e;
    }
    if (/^[\d.]+%?$/.test(t)) return { v: Number.parseFloat(t), pct: t.endsWith("%") };
    const fn = t.toLowerCase();
    if (fn === "calc(") {
      const e = sum();
      if (take() !== ")") throw new Error(`css-math: unbalanced calc() in "${expr}"`);
      return e;
    }
    if (fn === "min(" || fn === "max(") {
      const args = [sum()];
      while (peek() === ",") {
        take();
        args.push(sum());
      }
      if (take() !== ")") throw new Error(`css-math: unbalanced ${fn}) in "${expr}"`);
      for (const a of args) same(args[0], a, fn);
      return { v: (fn === "min(" ? Math.min : Math.max)(...args.map((a) => a.v)), pct: args[0].pct };
    }
    throw new Error(`css-math: cannot evaluate "${t}" in "${expr}"`);
  }
  /** @returns {{ v: number, pct: boolean }} */
  function product() {
    let a = factor();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const b = factor();
      if (op === "*") {
        if (a.pct && b.pct) throw new Error(`css-math: % * % in "${expr}"`);
        a = { v: a.v * b.v, pct: a.pct || b.pct };
      } else {
        if (b.pct) throw new Error(`css-math: division by a percentage in "${expr}"`);
        a = { v: a.v / b.v, pct: a.pct };
      }
    }
    return a;
  }
  /** @returns {{ v: number, pct: boolean }} */
  function sum() {
    let a = product();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const b = product();
      same(a, b, op);
      a = { v: op === "+" ? a.v + b.v : a.v - b.v, pct: a.pct };
    }
    return a;
  }
  const out = sum();
  if (pos !== tokens.length) throw new Error(`css-math: trailing input in "${expr}"`);
  return out;
}
