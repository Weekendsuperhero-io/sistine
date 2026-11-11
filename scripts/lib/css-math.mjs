/**
 * The two pieces of CSS value computation the theme's checks need and nothing in the toolchain exposes:
 * var() substitution and the math the engine composes.
 *
 * Shared by tests/theme-cascade.ts (the cascade model the deep-night tests measure the theme with) and
 * scripts/check-gamut.mjs (which sweeps the night wash cap, a hue-dependent expression, across the hue
 * circle). jsdom cascades custom properties but evaluates neither, and the browser is not in the loop.
 *
 * Deliberately strict: an unknown function, a unit mismatch (min(58%, 35) is invalid CSS) or an undeclared
 * var() with no fallback is an error, never a guess. Numbers, percentages and angles in degrees; + - * /;
 * calc(), min(), max(), and the trigonometry the night wash cap wraps its hue with (sin(), cos(), atan2()):
 * the whole vocabulary the colour tokens use.
 *
 * Two ways to evaluate: evaluate() parses an expression each time it is called, and compile() parses it once
 * into a function of named placeholders, for a sweep that evaluates one expression at thousands of values.
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
 * Evaluate a substituted CSS math expression to a number, remembering its unit: `pct` for a percentage,
 * `deg` for an angle (a value in degrees). A number has neither.
 * @param {string} expr
 * @returns {{ v: number, pct: boolean, deg?: boolean }}
 */
export function evaluate(expr) {
  const tokens = expr.match(/[\d.]+(?:%|deg)?|[a-z0-9-]+\(|[()*/+,-]/gi) ?? [];
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  /** @typedef {{ v: number, pct: boolean, deg?: boolean }} Num */
  /** @param {Num} a */
  const unit = (a) => (a.pct ? "%" : a.deg ? "deg" : "");
  /** @param {Num} a @param {Num} b @param {string} op */
  const same = (a, b, op) => {
    if (unit(a) !== unit(b)) throw new Error(`css-math: ${op} mixes "${unit(a)}" and "${unit(b)}" in "${expr}"`);
  };
  /** @returns {Num[]} */
  const args = () => {
    const out = [sum()];
    while (peek() === ",") {
      take();
      out.push(sum());
    }
    if (take() !== ")") throw new Error(`css-math: unbalanced arguments in "${expr}"`);
    return out;
  };
  /** @returns {Num} */
  function factor() {
    const t = take();
    if (t === undefined) throw new Error(`css-math: unexpected end of "${expr}"`);
    if (t === "-") {
      const f = factor();
      return { ...f, v: -f.v };
    }
    if (t === "(") {
      const e = sum();
      if (take() !== ")") throw new Error(`css-math: unbalanced "${expr}"`);
      return e;
    }
    if (/^[\d.]+(?:%|deg)?$/i.test(t)) return { v: Number.parseFloat(t), pct: t.endsWith("%"), deg: /deg$/i.test(t) };
    const fn = t.toLowerCase();
    if (fn === "calc(") {
      const e = sum();
      if (take() !== ")") throw new Error(`css-math: unbalanced calc() in "${expr}"`);
      return e;
    }
    if (fn === "min(" || fn === "max(") {
      const a = args();
      for (const x of a) same(a[0], x, fn);
      return { ...a[0], v: (fn === "min(" ? Math.min : Math.max)(...a.map((x) => x.v)) };
    }
    if (fn === "sin(" || fn === "cos(") {
      const [a, extra] = args();
      if (extra || a.pct) throw new Error(`css-math: ${fn}) takes one angle or number in "${expr}"`);
      /* An angle is in degrees; a bare number is radians, as CSS reads it. */
      const r = a.deg ? (a.v * Math.PI) / 180 : a.v;
      return { v: fn === "sin(" ? Math.sin(r) : Math.cos(r), pct: false };
    }
    if (fn === "atan2(") {
      const [y, x, extra] = args();
      if (extra || !x) throw new Error(`css-math: atan2() takes two arguments in "${expr}"`);
      same(y, x, fn);
      return { v: (Math.atan2(y.v, x.v) * 180) / Math.PI, pct: false, deg: true };
    }
    throw new Error(`css-math: cannot evaluate "${t}" in "${expr}"`);
  }
  /** @returns {Num} */
  function product() {
    let a = factor();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const b = factor();
      if (op === "*") {
        if (unit(a) && unit(b)) throw new Error(`css-math: "${unit(a)}" * "${unit(b)}" in "${expr}"`);
        a = { v: a.v * b.v, pct: a.pct || b.pct, deg: a.deg || b.deg };
      } else {
        if (unit(b)) throw new Error(`css-math: division by a "${unit(b)}" in "${expr}"`);
        a = { ...a, v: a.v / b.v };
      }
    }
    return a;
  }
  /** @returns {Num} */
  function sum() {
    let a = product();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const b = product();
      same(a, b, op);
      a = { ...a, v: op === "+" ? a.v + b.v : a.v - b.v };
    }
    return a;
  }
  const out = sum();
  if (pos !== tokens.length) throw new Error(`css-math: trailing input in "${expr}"`);
  return out;
}

/**
 * Compile a substituted CSS math expression ONCE into a function of named placeholders, for a sweep that
 * evaluates the same expression at thousands of values (a hue-following cap at every tenth of a degree):
 * `compile(expr, ["HUE"])` tokenizes and parses `expr` a single time, and the function it returns evaluates
 * it with `{ HUE: 264.13 }` (a number is unitless; pass `{ v, pct, deg }` for a percentage or an angle).
 * Same vocabulary, units and errors as {@link evaluate}: a malformed expression throws when compiled, a unit
 * mismatch when evaluated, each with evaluate's message. evaluate stays a separate implementation on purpose:
 * it is the reference tests/css-math.test.ts holds this to, at every operator and on the real cap
 * expressions. A placeholder name must not occur in the expression as anything else.
 * @param {string} expr
 * @param {string[]} [names]
 * @returns {(vars?: Record<string, number | { v: number, pct: boolean, deg?: boolean }>) => { v: number, pct: boolean, deg?: boolean }}
 */
export function compile(expr, names = []) {
  const known = new Set(names);
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const placeholder = names.length ? `(?<![\\w-])(?:${names.map(escape).join("|")})(?![\\w(-])|` : "";
  const tokens = expr.match(new RegExp(`${placeholder}[\\d.]+(?:%|deg)?|[a-z0-9-]+\\(|[()*/+,-]`, "gi")) ?? [];
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  /** @typedef {{ v: number, pct: boolean, deg?: boolean }} Num */
  /** @typedef {(vars: Record<string, number | Num>) => Num} Node */
  /** @param {Num} a */
  const unit = (a) => (a.pct ? "%" : a.deg ? "deg" : "");
  /** @param {Num} a @param {Num} b @param {string} op */
  const same = (a, b, op) => {
    if (unit(a) !== unit(b)) throw new Error(`css-math: ${op} mixes "${unit(a)}" and "${unit(b)}" in "${expr}"`);
  };
  /** @returns {Node[]} */
  const args = () => {
    const out = [sum()];
    while (peek() === ",") {
      take();
      out.push(sum());
    }
    if (take() !== ")") throw new Error(`css-math: unbalanced arguments in "${expr}"`);
    return out;
  };
  /** @returns {Node} */
  function factor() {
    const t = take();
    if (t === undefined) throw new Error(`css-math: unexpected end of "${expr}"`);
    if (t === "-") {
      const f = factor();
      return (vars) => {
        const x = f(vars);
        return { ...x, v: -x.v };
      };
    }
    if (t === "(") {
      const e = sum();
      if (take() !== ")") throw new Error(`css-math: unbalanced "${expr}"`);
      return e;
    }
    if (/^[\d.]+(?:%|deg)?$/i.test(t)) {
      const n = Object.freeze({ v: Number.parseFloat(t), pct: t.endsWith("%"), deg: /deg$/i.test(t) });
      return () => n;
    }
    if (known.has(t)) {
      return (vars) => {
        const x = vars[t];
        /* Shaped as a literal is (evaluate reads "58" as { v: 58, pct: false, deg: false }). */
        if (typeof x === "number") return { v: x, pct: false, deg: false };
        if (x && typeof x.v === "number") return { v: x.v, pct: !!x.pct, deg: !!x.deg };
        throw new Error(`css-math: ${t} has no value in "${expr}"`);
      };
    }
    const fn = t.toLowerCase();
    if (fn === "calc(") {
      const e = sum();
      if (take() !== ")") throw new Error(`css-math: unbalanced calc() in "${expr}"`);
      return e;
    }
    if (fn === "min(" || fn === "max(") {
      const a = args();
      const pick = fn === "min(" ? Math.min : Math.max;
      return (vars) => {
        const xs = a.map((f) => f(vars));
        for (const x of xs) same(xs[0], x, fn);
        return { ...xs[0], v: pick(...xs.map((x) => x.v)) };
      };
    }
    if (fn === "sin(" || fn === "cos(") {
      const [a, extra] = args();
      if (extra) throw new Error(`css-math: ${fn}) takes one angle or number in "${expr}"`);
      const trig = fn === "sin(" ? Math.sin : Math.cos;
      return (vars) => {
        const x = a(vars);
        if (x.pct) throw new Error(`css-math: ${fn}) takes one angle or number in "${expr}"`);
        /* An angle is in degrees; a bare number is radians, as CSS reads it. */
        return { v: trig(x.deg ? (x.v * Math.PI) / 180 : x.v), pct: false };
      };
    }
    if (fn === "atan2(") {
      const [fy, fx, extra] = args();
      if (extra || !fx) throw new Error(`css-math: atan2() takes two arguments in "${expr}"`);
      return (vars) => {
        const y = fy(vars);
        const x = fx(vars);
        same(y, x, fn);
        return { v: (Math.atan2(y.v, x.v) * 180) / Math.PI, pct: false, deg: true };
      };
    }
    throw new Error(`css-math: cannot evaluate "${t}" in "${expr}"`);
  }
  /** @returns {Node} */
  function product() {
    let a = factor();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const left = a;
      const right = factor();
      a =
        op === "*"
          ? (vars) => {
              const x = left(vars);
              const y = right(vars);
              if (unit(x) && unit(y)) throw new Error(`css-math: "${unit(x)}" * "${unit(y)}" in "${expr}"`);
              return { v: x.v * y.v, pct: x.pct || y.pct, deg: x.deg || y.deg };
            }
          : (vars) => {
              const x = left(vars);
              const y = right(vars);
              if (unit(y)) throw new Error(`css-math: division by a "${unit(y)}" in "${expr}"`);
              return { ...x, v: x.v / y.v };
            };
    }
    return a;
  }
  /** @returns {Node} */
  function sum() {
    let a = product();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const left = a;
      const right = product();
      a = (vars) => {
        const x = left(vars);
        const y = right(vars);
        same(x, y, op);
        return { ...x, v: op === "+" ? x.v + y.v : x.v - y.v };
      };
    }
    return a;
  }
  const root = sum();
  if (pos !== tokens.length) throw new Error(`css-math: trailing input in "${expr}"`);
  return (vars = {}) => root(vars);
}
