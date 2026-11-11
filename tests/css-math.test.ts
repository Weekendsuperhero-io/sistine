/**
 * scripts/lib/css-math: `compile`, which parses an expression once for a sweep, against `evaluate`, which
 * parses it every time and is the reference. Two implementations on purpose: if they ever disagree, at any
 * operator, unit or error, this says so before a sweep measures the wrong thing quickly.
 */
import { describe, expect, it } from "vitest";
import { compile, evaluate } from "../scripts/lib/css-math.mjs";
import { computedVars, html, type ModelElement } from "./theme-cascade";

const outcome = (run: () => unknown, quoted = true) => {
  try {
    return {
      value: run(),
    };
  } catch (e) {
    /* With a placeholder the message quotes the expression as compiled (with "L" where evaluate quotes
       the substituted "58"), so a placeholder comparison drops the quoted expression. */
    const message = (e as Error).message;
    return {
      error: quoted ? message : message.replace(/ in "[\s\S]*"$/, ""),
    };
  }
};

/** Every operator, unit and function the colour tokens use, and every error evaluate raises. */
const EXPRESSIONS = [
  "0",
  "42",
  ".5",
  "35%",
  "90deg",
  "1 + 2 * 3",
  "(1 + 2) * 3",
  "10 / 4 - 1",
  "- 3 + 5",
  "- (2 - 5) * 3",
  "2 * - 3",
  "calc(0.13883 - 0.004206 * (12 - 29.3))",
  "calc(58% * 0.5)",
  "min(64%, calc(35 * 1%))",
  "max(0.057, min(0.2, calc(0.1 + 200 * (1 - 0.9995))))",
  "min(3, 1, 2)",
  "max(-1, - 2)",
  "sin(30deg)",
  "cos(1)",
  "sin(atan2(sin(250 * 1deg), cos(250 * 1deg)) / 10000) * 572958",
  "atan2(1, -1)",
  "atan2(0.5deg, 1deg)",
  "calc(sin(atan2(sin(-455.8652 * 1deg), cos(-455.8652 * 1deg)) / 10000) * 572958)",
  "12px",
  // Errors evaluate raises, which compile must raise with the same message:
  "min(10%, 3)",
  "1 + 2deg",
  "2% * 3%",
  "4 / 2%",
  "sin(10%)",
  "sin(1, 2)",
  "atan2(1)",
  "atan2(1deg, 1)",
  "calc(1 + 2",
  "min(1, 2",
  "(1 + 2",
  "1 2",
  "",
  "1 +",
  "foo(1)",
  "-(2 - 5) * 3",
];

describe("css-math: compile agrees with evaluate", () => {
  it.each(EXPRESSIONS)("%s", (expr) => {
    expect(outcome(() => compile(expr)())).toEqual(outcome(() => evaluate(expr)));
  });

  it("evaluates a placeholder as the number substituted into the text would", () => {
    const expr = "max(0.057, min(calc(0.13883 - 0.004206 * (HUE - 29.3)), calc(0.13891 + 200 * (HUE + 95.865))), calc(HUE * 2 - HUE))";
    const f = compile(expr, [
      "HUE",
    ]);
    for (let h = -720; h <= 1080; h += 7.3)
      expect(
        outcome(
          () =>
            f({
              HUE: h,
            }),
          false,
        ),
      ).toEqual(outcome(() => evaluate(expr.replaceAll("HUE", String(h))), false));
  });

  it("evaluates a call that recurs verbatim once per evaluation, and never carries it to the next", () => {
    const expr = "calc(sin(HUE * 1deg) + sin(HUE * 1deg) * 2 - max(HUE, 3) + max(HUE, 3) * min(sin(HUE * 1deg), 0.5))";
    const f = compile(expr, [
      "HUE",
    ]);
    for (const h of [
      10,
      -5,
      10,
      400,
      3,
      3,
      3.5,
      -720,
    ])
      expect(
        f({
          HUE: h,
        }),
        `h${h}`,
      ).toEqual(evaluate(expr.replaceAll("HUE", String(h))));
  });

  it("gives a placeholder a declared unit, checks units when compiling, and refuses a missing value", () => {
    const pct = compile(
      "min(L, calc(35 * 1%))",
      [
        "L",
      ],
      {
        L: "%",
      },
    );
    expect(
      pct({
        L: 58,
      }),
    ).toEqual(evaluate("min(58%, calc(35 * 1%))"));
    // A unitless L against a percentage: the unit error evaluate raises, raised once, when compiling.
    expect(
      outcome(
        () =>
          compile("min(L, calc(35 * 1%))", [
            "L",
          ]),
        false,
      ),
    ).toEqual(outcome(() => evaluate("min(58, calc(35 * 1%))"), false));
    expect(() => pct({})).toThrow(/L has no value/);
  });

  it("matches evaluate on the shipped night wash cap, at hues from -720 to 1080 and at the cusps", () => {
    /* The cap the browser evaluates per tint scope, resolved through the cascade with the hue left as a
       placeholder, exactly as the sweeps use it. */
    const scope: ModelElement[] = [
      ...html(true),
      {
        attrs: {
          "data-glass-tint": "",
        },
        style: {
          "--glass-tint-h": "HUE",
          "--glass-tint-c": "0.09",
          "--glass-tint-a": "0.5",
        },
      },
    ];
    const expr = computedVars(scope).get("--glass-wash-c-max");
    if (!expr) throw new Error("--glass-wash-c-max does not compute on a custom night scope");
    const f = compile(expr, [
      "HUE",
    ]);
    const hues = [];
    for (let h = -720; h <= 1080; h += 2.9) hues.push(h);
    for (const c of [
      29.281,
      142.484,
      264.135,
    ])
      for (const k of [
        -0.0011,
        -0.0002,
        0,
        0.0003,
      ])
        hues.push(c + k, c - 360 + k);
    for (const h of hues)
      expect(
        f({
          HUE: h,
        }),
        `h${h}`,
      ).toEqual(evaluate(expr.replaceAll("HUE", String(h))));
  });
  it.each([
    "--glass-solidify-c-max-at-92",
    "--glass-solidify-c-max-at-18",
    "--glass-gloss-c-max",
    "--glass-wash-c-max",
  ])("matches evaluate on the shipped day cap %s, at hues from -720 to 1080", (token) => {
    const scope: ModelElement[] = [
      {
        attrs: {
          "data-glass-tint": "",
        },
        style: {
          "--glass-tint-h": "HUE",
          "--glass-tint-c": "0.09",
          "--glass-tint-a": "0.5",
        },
      },
    ];
    const expr = computedVars(scope).get(token);
    if (!expr) throw new Error(`${token} does not compute on a custom day scope`);
    const f = compile(expr, [
      "HUE",
    ]);
    for (let h = -720; h <= 1080; h += 9.7)
      expect(
        f({
          HUE: h,
        }),
        `h${h}`,
      ).toEqual(evaluate(expr.replaceAll("HUE", String(h))));
  });

  it("matches evaluate on the day backing cap's blend, at every backing lightness from 0 to 100", () => {
    /* The blend reads the scope's --glass-solidify-l: left as a second placeholder. */
    const scope: ModelElement[] = [
      {
        attrs: {
          "data-glass-tint": "",
        },
        style: {
          "--glass-tint-h": "HUE",
          "--glass-tint-c": "0.09",
          "--glass-tint-a": "0.5",
          "--glass-solidify-l": "L",
        },
      },
    ];
    const expr = computedVars(scope).get("--glass-solidify-c-max");
    if (!expr) throw new Error("--glass-solidify-c-max does not compute on a custom day scope");
    const f = compile(expr, [
      "HUE",
      "L",
    ]);
    for (let l = 0; l <= 100; l += 4.5)
      for (const h of [
        -95.9,
        29.6,
        110,
        263.86,
        430,
      ])
        expect(
          f({
            HUE: h,
            L: l,
          }),
          `L${l} h${h}`,
        ).toEqual(evaluate(expr.replaceAll("HUE", String(h)).replaceAll("L", String(l))));
  });
});
