/**
 * Night is pinned, value for value: every custom property the theme computes at night, on every scope
 * below, equals a snapshot taken from the tree before the day-only change that introduced it (bfd0aff,
 * the deep-night tree). It is the mirror of tests/deep-night.test.ts's day snapshot: a change meant for
 * day that leaks into night fails here, by token and scope.
 *
 * Measured through tests/theme-cascade (the cascade, var() and the engine's math). A value is compared
 * by what it computes to, not by how it is written: every oklch(), calc(), min() and max() inside it is
 * evaluated (to 1e-9), so a formula may be refactored freely as long as night lands on the same numbers.
 * A token the snapshot does not know (a new day knob that also computes at night) is listed in
 * NEW_AT_NIGHT, so adding one is a decision rather than an accident.
 *
 * Scopes: <html class="dark"> bare and with every preset; every gloss flavour, page style and material
 * under a few presets; presets nested in each other; and custom colours (the way the switcher and a
 * consumer's re-tint scope apply them), on <html> and nested, at hues past 0–360 too.
 *
 * Regenerate only for a deliberate NIGHT change, from the tree it should describe:
 *   UPDATE_NIGHT_SNAPSHOT=1 THEME_ROOT=<a checkout's root> bun run test:dom tests/night-snapshot.test.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluate } from "../scripts/lib/css-math.mjs";
import { computedVars, evalOklch, html, type ModelElement, presetNames } from "./theme-cascade";

const SNAPSHOT = "tests/fixtures/night-snapshot.json";
/** Tokens that compute at night now and did not when the snapshot was taken, each with why it is safe. */
const NEW_AT_NIGHT: Record<string, string> = {
  /* Vibrant day: the backing's own chroma scale, split from the opaque floor's so day can raise it. At night
     tokens.css's night rule sets it to var(--glass-opaque-c-scale), so --glass-solidify-bg (pinned here)
     is what it was. */
  "--glass-solidify-c-scale": "the backing's day scale; at night it is the opaque floor's",
};

const r9 = (x: number) => {
  const v = Math.round(x * 1e9) / 1e9;
  return Object.is(v, -0) ? 0 : v;
};
const MATH = /^(?:calc|min|max|clamp|sin|cos|atan2)$/i;
const PLAIN_MATH = /^[\s\d.%+\-*/(),]*$/;

/** A whole value as numbers, if it is one: an oklch() colour or a math expression. */
function asValue(s: string): string | undefined {
  const t = s.trim();
  if (/^oklch\(/i.test(t)) {
    try {
      const c = evalOklch(t);
      return `oklch(${r9(c.l)} ${r9(c.c)} ${r9(c.h)} / ${r9(c.a)})`;
    } catch {
      return undefined;
    }
  }
  if (!PLAIN_MATH.test(t.replace(/(?:calc|min|max|clamp|sin|cos|atan2)\(/gi, "(").replace(/deg/gi, ""))) return undefined;
  try {
    const n = evaluate(t);
    return `${r9(n.v)}${n.pct ? "%" : n.deg ? "deg" : ""}`;
  } catch {
    return undefined;
  }
}

/** A value with every evaluable colour and expression inside it replaced by its numbers. */
function canonical(value: string): string {
  const whole = asValue(value);
  if (whole !== undefined) return whole;
  let out = "";
  let i = 0;
  while (i < value.length) {
    const m = /[a-z-]+\(/i.exec(value.slice(i));
    if (!m) {
      out += value.slice(i);
      break;
    }
    const start = i + m.index;
    out += value.slice(i, start);
    let depth = 0;
    let end = start + m[0].length - 1;
    for (; end < value.length; end++) {
      if (value[end] === "(") depth++;
      else if (value[end] === ")" && --depth === 0) break;
    }
    const call = value.slice(start, end + 1);
    const name = m[0].slice(0, -1);
    const v = name.toLowerCase() === "oklch" || MATH.test(name) ? asValue(call) : undefined;
    out += v ?? `${name}(${canonical(value.slice(start + m[0].length, end))})`;
    i = end + 1;
  }
  return out
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

const night = (tint?: string, attrs: Record<string, string> = {}): ModelElement[] => {
  const [root] = html(true, tint);
  return [
    {
      ...root,
      attrs: {
        ...root.attrs,
        ...attrs,
      },
    },
  ];
};
const custom = (h: number, c: number, a: number): ModelElement => ({
  attrs: {
    "data-glass-tint": "",
  },
  style: {
    "--glass-tint-h": String(h),
    "--glass-tint-c": String(c),
    "--glass-tint-a": String(a),
  },
});
const customOnHtml = (h: number, c: number, a: number): ModelElement[] => {
  const [root] = html(true);
  return [
    {
      ...root,
      attrs: {
        "data-glass-tint": "",
      },
      style: custom(h, c, a).style,
    },
  ];
};

/** Every night scope the snapshot covers, by a readable name. */
function scopes(): Array<
  [
    string,
    ModelElement[],
  ]
> {
  const out: Array<
    [
      string,
      ModelElement[],
    ]
  > = [];
  const tints = [
    undefined,
    ...presetNames(),
  ];
  for (const t of tints)
    out.push([
      `html ${t ?? "(default)"}`,
      night(t),
    ]);
  const few = [
    undefined,
    "lapis",
    "peridot",
    "moonstone",
    "onyx",
    "celestite",
    "aurora",
    "success",
  ];
  const name = (t?: string) => t ?? "(default)";
  for (const t of few) {
    for (const gloss of [
      "tonal",
      "hue",
      "white",
    ])
      out.push([
        `html ${name(t)} gloss=${gloss}`,
        night(t, {
          "data-gloss": gloss,
        }),
      ]);
    for (const page of [
      "chakra",
      "crystal",
      "frosted",
      "lucite",
      "lustre",
      "opaque",
    ])
      out.push([
        `html ${name(t)} glass=${page}`,
        night(t, {
          "data-glass": page,
        }),
      ]);
    for (const material of [
      "glass",
      "frosted",
      "crystal",
      "chakra",
      "lucite",
      "lustre",
      "opaque",
    ]) {
      out.push([
        `html ${name(t)} > material=${material}`,
        [
          ...night(t),
          {
            attrs: {
              "data-material": material,
            },
          },
        ],
      ]);
    }
    out.push([
      `html ${name(t)} > surface=veil`,
      [
        ...night(t),
        {
          attrs: {
            "data-surface": "veil",
          },
        },
      ],
    ]);
  }
  for (const page of few) {
    for (const inner of [
      "lapis",
      "peridot",
      "moonstone",
      "onyx",
      "celestite",
      "aurora",
      "success",
      "destructive",
    ]) {
      if (inner !== page)
        out.push([
          `html ${name(page)} > ${inner}`,
          [
            ...night(page),
            {
              attrs: {
                "data-glass-tint": inner,
              },
            },
          ],
        ]);
    }
  }
  const hues = [
    -500,
    -95.865,
    0,
    29.281,
    70,
    142.484,
    190,
    205,
    264.13,
    264.14,
    268,
    300,
    430,
    999,
  ];
  for (const h of hues)
    out.push([
      `html custom h${h}`,
      customOnHtml(h, 0.09, 0.5),
    ]);
  for (const page of few)
    for (const h of [
      0,
      128,
      268,
      430,
    ])
      out.push([
        `html ${name(page)} > custom h${h}`,
        [
          ...night(page),
          custom(h, 0.12, 0.35),
        ],
      ]);
  return out;
}

/** name → token → canonical value, every token the scope computes. */
function measure(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [label, chain] of scopes()) {
    const vars = computedVars(chain);
    out[label] = Object.fromEntries(
      [
        ...vars,
      ]
        .map(([k, v]) => [
          k,
          canonical(v),
        ])
        .sort(([a], [b]) => (a < b ? -1 : 1)),
    );
  }
  return out;
}

/* Stored compactly: the token names once, each distinct value once, and per scope one line holding a value
   index per token ("-" where the scope does not compute it), so a change diffs by scope. */
interface Stored {
  tokens: string[];
  values: string[];
  scopes: Record<string, string>;
}
const pack = (m: Record<string, Record<string, string>>): string => {
  const tokens = [
    ...new Set(Object.values(m).flatMap((t) => Object.keys(t))),
  ].sort();
  const values: string[] = [];
  const index = new Map<string, number>();
  const at = (v: string | undefined) => {
    if (v === undefined) return "-";
    let i = index.get(v);
    if (i === undefined) {
      i = values.push(v) - 1;
      index.set(v, i);
    }
    return String(i);
  };
  const scopes = Object.fromEntries(
    Object.entries(m).map(([s, t]) => [
      s,
      tokens.map((k) => at(t[k])).join(" "),
    ]),
  );
  return `${JSON.stringify(
    {
      tokens,
      values,
      scopes,
    },
    null,
    2,
  )}\n`;
};
const unpack = (s: Stored): Record<string, Record<string, string>> =>
  Object.fromEntries(
    Object.entries(s.scopes).map(([name, row]) => [
      name,
      Object.fromEntries(
        row.split(" ").flatMap((i, k) =>
          i === "-"
            ? []
            : [
                [
                  s.tokens[k],
                  s.values[Number(i)],
                ],
              ],
        ),
      ),
    ]),
  );

describe("night is unchanged", () => {
  const now = measure();
  if (process.env.UPDATE_NIGHT_SNAPSHOT === "1") writeFileSync(SNAPSHOT, pack(now));
  const before = unpack(JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Stored);

  it("covers the scopes the snapshot was taken over", () => {
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
    expect(Object.keys(now).length).toBeGreaterThan(200);
  });

  it.each(Object.keys(before))("%s: every token computes what it did", (scope) => {
    const was = before[scope];
    const is = now[scope] ?? {};
    const changed = Object.keys(was)
      .filter((k) => is[k] !== was[k])
      .map((k) => `${k}: ${was[k]} → ${is[k] ?? "(no longer computes)"}`);
    expect(changed.join("\n"), `${scope}: night values changed`).toBe("");
    const added = Object.keys(is).filter((k) => !(k in was) && !(k in NEW_AT_NIGHT));
    expect(added.join(", "), `${scope}: tokens that compute at night now and did not (list them in NEW_AT_NIGHT with why)`).toBe("");
  });
});
