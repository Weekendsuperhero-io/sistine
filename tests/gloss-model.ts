/**
 * The gloss as a browser lays it on a surface of a given size: each layer of a computed stack (a
 * linear-gradient or a circle radial-gradient, as tests/theme-cascade computes it) resolved to its geometry
 * in px, and the alpha it paints at a point.
 *
 * tests/theme-cascade computes the tokens, but a gradient's percentages and lengths only become positions on
 * a surface: a stop's percentage is one of its gradient line (a linear gradient) or its ray (a radial one),
 * the centre's of the box. So whether a gloss crosses a small control's face, or a card draws what it drew,
 * is a question about sizes, and this answers it from the computed values, as CSS Images 4 says: the line's
 * length (|w sin a| + |h cos a|), the farthest corner, a missing first or last position at 0 or 100%, a stop
 * or hint before an earlier one moved up to it, and a hint's curve (a power of ln 0.5 / ln of its share).
 * Alpha is interpolated as premultiplied colour is, linearly in the stop (or the hint's curve). Anything it
 * does not know is an error, never a guess.
 */
import { evalOklch } from "./theme-cascade";

/** 1rem in px, as the theme's demo and every test here assume. */
const REM = 16;

/** Split on top-level commas (outside parentheses). */
export function splitArgs(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

interface Num {
  v: number;
  kind: "len" | "num" | "deg";
}

/** A CSS math expression (calc, min, max, clamp; %, px, rem, deg) in px, a percentage being one of `base`. */
function evaluate(expr: string, base: number): Num {
  const tokens = expr.match(/\d*\.?\d+(?:e[+-]?\d+)?(?:%|px|rem|deg)?|[a-z-]+\(|[()*/+,-]/gi) ?? [];
  let pos = 0;
  const fail = (why: string): never => {
    throw new Error(`gloss-model: ${why} in "${expr}"`);
  };
  const same = (a: Num, b: Num, op: string) => {
    if (a.kind !== b.kind) fail(`${op} mixes ${a.kind} and ${b.kind}`);
  };
  const args = (): Num[] => {
    const out = [
      sum(),
    ];
    while (tokens[pos] === ",") {
      pos++;
      out.push(sum());
    }
    if (tokens[pos++] !== ")") fail("unbalanced arguments");
    return out;
  };
  function factor(): Num {
    const t = tokens[pos++];
    if (t === undefined) return fail("unexpected end");
    if (t === "-") {
      const f = factor();
      return {
        ...f,
        v: -f.v,
      };
    }
    if (t === "(" || t.toLowerCase() === "calc(") {
      const e = sum();
      if (tokens[pos++] !== ")") fail("unbalanced parenthesis");
      return e;
    }
    const m = /^(\d*\.?\d+(?:e[+-]?\d+)?)(%|px|rem|deg)?$/i.exec(t);
    if (m) {
      const n = Number.parseFloat(m[1]);
      const unit = m[2]?.toLowerCase();
      if (unit === "%")
        return {
          v: (n * base) / 100,
          kind: "len",
        };
      if (unit === "px")
        return {
          v: n,
          kind: "len",
        };
      if (unit === "rem")
        return {
          v: n * REM,
          kind: "len",
        };
      if (unit === "deg")
        return {
          v: n,
          kind: "deg",
        };
      return {
        v: n,
        kind: "num",
      };
    }
    const fn = t.toLowerCase();
    if (fn === "min(" || fn === "max(" || fn === "clamp(") {
      const a = args();
      for (const x of a) same(a[0], x, fn);
      if (fn === "clamp(") {
        if (a.length !== 3) fail("clamp() takes three arguments");
        // clamp(MIN, VAL, MAX) = max(MIN, min(VAL, MAX)): MIN wins when MIN > MAX.
        return {
          v: Math.max(a[0].v, Math.min(a[1].v, a[2].v)),
          kind: a[0].kind,
        };
      }
      return {
        v: (fn === "min(" ? Math.min : Math.max)(...a.map((x) => x.v)),
        kind: a[0].kind,
      };
    }
    return fail(`cannot evaluate "${t}"`);
  }
  function product(): Num {
    let a = factor();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos++];
      const b = factor();
      if (op === "*") {
        if (a.kind !== "num" && b.kind !== "num") fail(`${a.kind} * ${b.kind}`);
        a = {
          v: a.v * b.v,
          kind: a.kind === "num" ? b.kind : a.kind,
        };
      } else {
        if (b.kind !== "num") fail(`division by a ${b.kind}`);
        a = {
          v: a.v / b.v,
          kind: a.kind,
        };
      }
    }
    return a;
  }
  function sum(): Num {
    let a = product();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++];
      const b = product();
      same(a, b, op);
      a = {
        v: op === "+" ? a.v + b.v : a.v - b.v,
        kind: a.kind,
      };
    }
    return a;
  }
  const out = sum();
  if (pos !== tokens.length) fail("trailing input");
  return out;
}

/** A length-percentage in px, a percentage being one of `base`. */
function px(expr: string, base: number): number {
  const n = evaluate(expr, base);
  if (n.kind !== "len") throw new Error(`gloss-model: "${expr}" is a ${n.kind}, not a length`);
  return n.v;
}

/** A colour as numbers (l 0–100, c, h, a), `transparent` and a color-mix() with transparent included. */
export interface Colour {
  l: number;
  c: number;
  h: number;
  a: number;
}
function colour(value: string): Colour {
  const v = value.trim();
  if (v === "transparent")
    return {
      l: 0,
      c: 0,
      h: 0,
      a: 0,
    };
  const mix = /^color-mix\(in oklab,\s*([\s\S]+)\s+([\d.]+)%,\s*transparent\)$/.exec(v);
  if (mix) {
    // Premultiplied, a share p of a colour mixed with transparent is that colour at p of its alpha.
    const c = colour(mix[1]);
    return {
      ...c,
      a: (c.a * Number.parseFloat(mix[2])) / 100,
    };
  }
  if (/^oklch\(/.test(v)) return evalOklch(v);
  throw new Error(`gloss-model: cannot read the colour "${value}"`);
}

/**
 * A computed stack with every oklch() in it evaluated to its numbers (to 1e-9) and its whitespace collapsed:
 * the same gradients, short enough to keep in a fixture (a wash's chroma cap substitutes to thousands of
 * tokens, a number to the browser) and quick to lay on many sizes.
 */
export function canonicalColours(stack: string): string {
  const r9 = (x: number) => {
    const v = Math.round(x * 1e9) / 1e9;
    return Object.is(v, -0) ? 0 : v;
  };
  let out = "";
  let i = 0;
  for (let at = stack.indexOf("oklch(", i); at !== -1; at = stack.indexOf("oklch(", i)) {
    let depth = 0;
    let end = at + 5;
    for (; end < stack.length; end++) {
      if (stack[end] === "(") depth++;
      else if (stack[end] === ")" && --depth === 0) break;
    }
    const c = evalOklch(stack.slice(at, end + 1));
    out += `${stack.slice(i, at)}oklch(${r9(c.l)}% ${r9(c.c)} ${r9(c.h)} / ${r9(c.a)})`;
    i = end + 1;
  }
  return (out + stack.slice(i)).replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
}

/** A colour stop at its position in px along the line (or ray), and a transition hint at its. */
export interface Stop {
  colour: Colour;
  at: number;
}
export interface Hint {
  hint: number;
}
export type Entry = Stop | Hint;
/** A colour stop as written, its position perhaps left to CSS. */
interface Written {
  colour: Colour;
  at: number | undefined;
}
const isStop = (e: Entry | Written | undefined): e is Stop => e !== undefined && "colour" in e;
const isClear = (e: Entry | undefined) => isStop(e) && e.colour.a === 0;

/** A layer resolved on a w × h surface: where its line or ray runs, and its stops in px along it. */
export interface Layer {
  kind: "linear" | "radial";
  /** linear: the angle in degrees; radial: unused (0). */
  angle: number;
  /** radial: the centre; linear: the line's start. */
  x: number;
  y: number;
  /** linear: the line's length; radial: the ray's (the farthest corner). */
  length: number;
  /** The interpolation space when one is given (`in oklch`), else "". */
  space: string;
  entries: Entry[];
}

const COLOUR_START = /^(oklch\(|color-mix\(|transparent\b)/;

/** Split a stop into its colour and the rest (its position), at the colour's closing parenthesis. */
function splitStop(arg: string): string[] {
  if (arg.startsWith("transparent"))
    return [
      "transparent",
      arg.slice("transparent".length).trim(),
    ];
  let depth = 0;
  for (let i = 0; i < arg.length; i++) {
    if (arg[i] === "(") depth++;
    else if (arg[i] === ")" && --depth === 0)
      return [
        arg.slice(0, i + 1),
        arg.slice(i + 1).trim(),
      ];
  }
  throw new Error(`gloss-model: unbalanced stop "${arg}"`);
}

/** Split on top-level whitespace (a radial position's X and Y). */
function splitTopSpace(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s.trim()) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** The direction of a linear gradient in degrees, from its first argument. */
function angleOf(arg: string): number {
  const side: Record<string, number> = {
    "to top": 0,
    "to right": 90,
    "to bottom": 180,
    "to left": 270,
  };
  if (arg in side) return side[arg];
  const n = evaluate(arg, 0);
  if (n.kind !== "deg") throw new Error(`gloss-model: "${arg}" is not an angle`);
  return n.v;
}

/** One layer of a computed stack, resolved on a w × h surface; null for `none`. */
export function resolveLayer(layer: string, w: number, h: number): Layer | null {
  const text = layer.trim();
  if (text === "none") return null;
  const m = /^(linear|radial)-gradient\(([\s\S]*)\)$/.exec(text);
  if (!m) throw new Error(`gloss-model: not a gradient: "${text.slice(0, 80)}"`);
  const kind = m[1] === "linear" ? "linear" : "radial";
  const args = splitArgs(m[2]);
  let space = "";
  let head = "";
  if (!COLOUR_START.test(args[0])) {
    head = args.shift() ?? "";
    const sp = /\s+in\s+([a-z]+)$/.exec(head);
    if (sp) {
      space = sp[1];
      head = head.slice(0, sp.index).trim();
    }
  }
  let angle = 0;
  let x: number;
  let y: number;
  let length: number;
  if (kind === "linear") {
    angle = head === "" ? 180 : angleOf(head);
    const a = (angle * Math.PI) / 180;
    length = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
    x = w / 2 - (Math.sin(a) * length) / 2;
    y = h / 2 + (Math.cos(a) * length) / 2;
  } else {
    if (!head.startsWith("circle at ")) throw new Error(`gloss-model: only "circle at X Y" radial gradients are modelled: "${head}"`);
    const pos = splitTopSpace(head.slice("circle at ".length));
    if (pos.length !== 2) throw new Error(`gloss-model: a radial position needs X and Y: "${head}"`);
    x = px(pos[0], w);
    y = px(pos[1], h);
    length = Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y));
  }
  // Each stop at its position in px where it gives one; the first at 0 and the last at the end where they do not.
  const written: (Written | Hint)[] = args.map((arg) => {
    if (!COLOUR_START.test(arg))
      return {
        hint: px(arg, length),
      };
    const [c, rest] = splitStop(arg);
    return {
      colour: colour(c),
      at: rest ? px(rest, length) : undefined,
    };
  });
  const stops = written.filter((e) => "colour" in e);
  if (stops.length < 2) throw new Error(`gloss-model: a gradient needs two colour stops: "${text.slice(0, 80)}"`);
  stops[0].at ??= 0;
  stops[stops.length - 1].at ??= length;
  // A stop or hint before an earlier one is moved up to it. A stop between others with no position of its own is
  // spread out by CSS; the theme writes none, so this does not model it.
  let most = Number.NEGATIVE_INFINITY;
  const entries: Entry[] = written.map((e) => {
    if ("hint" in e) {
      most = Math.max(e.hint, most);
      return {
        hint: most,
      };
    }
    if (e.at === undefined) throw new Error(`gloss-model: a stop between others with no position: "${text.slice(0, 80)}"`);
    most = Math.max(e.at, most);
    return {
      colour: e.colour,
      at: most,
    };
  });
  return {
    kind,
    angle,
    x,
    y,
    length,
    space,
    entries,
  };
}

/**
 * A layer as what it paints, so two layers that paint the same pixels compare equal however their stops are
 * written. A clear stop (alpha 0) is clear whatever its l, c and h, as premultiplied colour is; it says something
 * only beside a stop that is not clear (where a ramp starts or ends), and a hint only beside one too. A stop that
 * repeats the one before it (its colour, at its position) says nothing either: a stop CSS moved up onto its twin
 * (Lustre's cut on a card) compares equal to the layer without it.
 */
export function painted(layer: Layer): Layer {
  const stops = layer.entries.filter(isStop);
  const out: Entry[] = [];
  layer.entries.forEach((e, i) => {
    const prev = out[out.length - 1];
    if (!isStop(e)) {
      const left = layer.entries.slice(0, i).findLast(isStop);
      const right = layer.entries.slice(i + 1).find(isStop);
      if (!(isClear(left) && isClear(right))) out.push(e);
      return;
    }
    const s = stops.indexOf(e);
    const clear = e.colour.a === 0;
    if (clear && !((s > 0 && !isClear(stops[s - 1])) || (s < stops.length - 1 && !isClear(stops[s + 1])))) return;
    const colour = clear
      ? {
          l: 0,
          c: 0,
          h: 0,
          a: 0,
        }
      : e.colour;
    if (
      isStop(prev) &&
      prev.at === e.at &&
      (
        [
          "l",
          "c",
          "h",
          "a",
        ] as const
      ).every((k) => prev.colour[k] === colour[k])
    )
      return;
    out.push({
      colour,
      at: e.at,
    });
  });
  return {
    ...layer,
    entries: out,
  };
}

/** How many rows of a w × h face a layer paints at all (its most, across the row, above 0). */
export function rowsLit(layer: Layer, w: number, h: number): number {
  let lit = 0;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (alphaAt(layer, i + 0.5, j + 0.5) > 0) {
        lit++;
        break;
      }
    }
  }
  return lit;
}

/** The alpha one layer paints at (x, y) on its surface. */
export function alphaAt(layer: Layer, x: number, y: number): number {
  let t: number;
  if (layer.kind === "linear") {
    const a = (layer.angle * Math.PI) / 180;
    t = (x - layer.x) * Math.sin(a) - (y - layer.y) * Math.cos(a);
  } else t = Math.hypot(x - layer.x, y - layer.y);
  const stops = layer.entries.filter(isStop);
  if (t <= stops[0].at) return stops[0].colour.a;
  if (t >= stops[stops.length - 1].at) return stops[stops.length - 1].colour.a;
  // The last stop at or before t, and the next: a position two stops share paints the later colour.
  let i = 0;
  for (let k = 0; k < stops.length; k++) if (stops[k].at <= t) i = k;
  const left = stops[i];
  const right = stops[i + 1];
  const span = right.at - left.at;
  let f = span > 0 ? (t - left.at) / span : 1;
  const hint = layer.entries.slice(layer.entries.indexOf(left) + 1, layer.entries.indexOf(right)).find((e): e is Hint => "hint" in e);
  if (hint && span > 0) {
    const share = (hint.hint - left.at) / span;
    if (share <= 0) f = 1;
    else if (share >= 1) f = 0;
    else f = f ** (Math.log(0.5) / Math.log(share));
  }
  return left.colour.a + (right.colour.a - left.colour.a) * f;
}

/** How a set of layers covers a w × h face, sampled at every pixel centre: the share at alpha 0.02 or more, the
 *  mean alpha, the mean across the middle third of its height (where a control's words are), and the most. */
export interface Coverage {
  share: number;
  mean: number;
  middle: number;
  max: number;
}
export function coverage(layers: Layer[], w: number, h: number): Coverage {
  let n = 0;
  let lit = 0;
  let sum = 0;
  let midN = 0;
  let midSum = 0;
  let max = 0;
  for (let j = 0; j < h; j++) {
    const mid = j >= h / 3 && j < (2 * h) / 3;
    for (let i = 0; i < w; i++) {
      let clear = 1;
      for (const l of layers) clear *= 1 - alphaAt(l, i + 0.5, j + 0.5);
      const a = 1 - clear;
      n++;
      sum += a;
      if (a >= 0.02) lit++;
      if (a > max) max = a;
      if (mid) {
        midN++;
        midSum += a;
      }
    }
  }
  return {
    share: lit / n,
    mean: sum / n,
    middle: midSum / midN,
    max,
  };
}
