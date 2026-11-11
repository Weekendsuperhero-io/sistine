/**
 * Vibrant day: by day the backing under sheer glass, the tonal crystal gloss and the tint wash take as much
 * of their own hue's sRGB ceiling as their share allows, where flat caps sized for the tightest hue used to
 * hold the hues that peak light (green, yellow, teal) to a fifth or a third of theirs.
 *
 *   backing  min(c × 1.36, 92% of the L92 ceiling)   --glass-solidify-c-scale / --glass-solidify-c-max
 *   gloss    min(c × gloss-tint, 95% of the L97 one)  --glass-gloss-c-max
 *   wash     min(c × 2.5, 95% of the L72 one)         --glass-wash-c-max (a preset whose wash sits at
 *                                                      another lightness pins its own, 95% there)
 *
 * The caps are hue-following fits (scripts/fit-hue-cap.mjs) that every tint scope evaluates, mirrored in
 * lib/oklch-utils for AutoForeground. Measured from the shipped CSS through tests/theme-cascade. Night is
 * pinned value for value by tests/night-snapshot.test.ts; the day values themselves by the day snapshot in
 * tests/deep-night.test.ts. The pale warm stone is exempt and keeps its day values.
 */
import { describe, expect, it } from "vitest";
import {
  DAY_BACKING_CAP,
  DAY_GLOSS_CAP,
  DAY_WASH_CAP,
  dayBackingCap,
  dayGlossCap,
  dayWashCap,
  type HueCapTable,
  maxSrgbChroma,
} from "@/lib/oklch-utils";
import { evaluate } from "../scripts/lib/css-math.mjs";
import { colorOf, computedVars, html, type ModelElement, numberOf, presetNames } from "./theme-cascade";

const ceiling = (l: number, h: number) => maxSrgbChroma(l, ((h % 360) + 360) % 360);

/** <html> by day with a custom colour inline (hue, chroma, alpha), the way the switcher applies one. */
const customDay = (h: number | string, c = 0.09, a = 0.5): ModelElement[] => [
  {
    attrs: {
      "data-glass-tint": "",
    },
    style: {
      "--glass-tint-h": String(h),
      "--glass-tint-c": String(c),
      "--glass-tint-a": String(a),
    },
  },
];
/** A consumer's re-tint scope (a tool card): a custom colour on an element inside a day page. */
const nestedDay = (h: number, c: number, a: number, page?: string): ModelElement[] => [
  ...html(false, page),
  ...customDay(h, c, a),
];

const CAPS: Array<{
  token: string;
  table: HueCapTable;
  mirror: (h: number) => number;
  l: number;
  share: number;
}> = [
  {
    token: "--glass-solidify-c-max",
    table: DAY_BACKING_CAP,
    mirror: dayBackingCap,
    l: 92,
    share: 0.92,
  },
  {
    token: "--glass-gloss-c-max",
    table: DAY_GLOSS_CAP,
    mirror: dayGlossCap,
    l: 97,
    share: 0.95,
  },
  {
    token: "--glass-wash-c-max",
    table: DAY_WASH_CAP,
    mirror: dayWashCap,
    l: 72,
    share: 0.95,
  },
];
/** What rounding a tangent's value to five decimals can add to a share, at the tightest hue. */
const SHARE_TOLERANCE = 0.002;
/** Every ten-thousandth of a degree within 0.01° of each breakpoint a table is cut at, in each turn from
 *  -720 to 1080: the cut lines are steep, so a slip there is a band narrower than a tenth of a degree. */
const breakpointSamples = (table: HueCapTable) =>
  [
    ...new Set(
      table.groups
        .flatMap((g) => [
          g.from[0],
          g.to[0],
        ])
        .map((h) => Math.round((((h % 360) + 360) % 360) * 1000) / 1000),
    ),
  ].flatMap((b) =>
    Array.from(
      {
        length: 5 * 201,
      },
      (_, i) => b + 360 * (Math.floor(i / 201) - 2) + ((i % 201) - 100) / 10000,
    ),
  );

describe("vibrant day: the day caps follow the hue", () => {
  it.each(
    CAPS.map(
      (c) =>
        [
          c.token,
          c,
        ] as const,
    ),
  )("%s evaluates, in CSS, to its lib/oklch-utils mirror at any hue", (_, cap) => {
    /* The cascade once, with the hue left as a placeholder, then the expression at every tenth of a degree
       and every ten-thousandth near the breakpoints. */
    const expr = computedVars(customDay("HUE")).get(cap.token);
    if (!expr) throw new Error(`${cap.token} does not compute on a custom day scope`);
    for (let tenth = -7200; tenth <= 10800; tenth++) {
      const h = tenth / 10;
      expect(evaluate(expr.replaceAll("HUE", String(h))).v, `h${h}`).toBeCloseTo(cap.mirror(h), 9);
    }
    for (const h of breakpointSamples(cap.table)) expect(evaluate(expr.replaceAll("HUE", String(h))).v, `h${h}`).toBeCloseTo(cap.mirror(h), 9);
    // The full cascade agrees with the placeholder route at a few hues.
    for (const h of [
      -500,
      0,
      110,
      268,
      430,
    ])
      expect(numberOf(cap.token, customDay(h)), `h${h}`).toBeCloseTo(cap.mirror(h), 9);
  });

  it.each(
    CAPS.map(
      (c) =>
        [
          c.token,
          c,
        ] as const,
    ),
  )("%s never passes its share of its surface's ceiling, at any hue", (_, cap) => {
    for (let h = -720; h <= 1080; h += 0.5) {
      expect(cap.mirror(h) / ceiling(cap.l, h), `h${h}`).toBeLessThanOrEqual(cap.share + SHARE_TOLERANCE);
    }
    for (const h of breakpointSamples(cap.table)) expect(cap.mirror(h) / ceiling(cap.l, h), `h${h}`).toBeLessThanOrEqual(cap.share + SHARE_TOLERANCE);
  });
});

describe("vibrant day: every preset's backing and gloss take their own hue's share", () => {
  /* The per-hue saturation: each surface delivers at least 89% of the lesser of what it asks and its
     hue's share of the ceiling (the fits hold 90% of the share at every hundredth of a degree). The flat
     caps these replaced delivered peridot's gloss 20% of that and the status tints' backing 29%. */
  const DELIVERS = 0.89;
  const tinted = presetNames().filter((t) => t !== "moonstone" && numberOf("--glass-tint-c", html(false, t)) > 0);

  it.each(tinted)("%s", (tint) => {
    const day = html(false, tint);
    const h = numberOf("--glass-tint-h", day);
    const c = numberOf("--glass-tint-c", day);
    const backing = colorOf("--glass-solidify-bg", day);
    const backingWant = Math.min(c * numberOf("--glass-solidify-c-scale", day), 0.92 * ceiling(backing.l, h));
    expect(backing.c, `backing C ${backing.c.toFixed(4)} against ${backingWant.toFixed(4)}`).toBeGreaterThanOrEqual(DELIVERS * backingWant);
    expect(backing.c).toBeLessThanOrEqual((0.92 + SHARE_TOLERANCE) * ceiling(backing.l, h));
    const gloss = colorOf("--glass-gloss-ink-tonal", day);
    const glossWant = Math.min(c * numberOf("--glass-gloss-tint", day), 0.95 * ceiling(gloss.l, h));
    expect(gloss.c, `gloss C ${gloss.c.toFixed(4)} against ${glossWant.toFixed(4)}`).toBeGreaterThanOrEqual(DELIVERS * glossWant);
    expect(gloss.c).toBeLessThanOrEqual((0.95 + SHARE_TOLERANCE) * ceiling(gloss.l, h));
  });

  it("and a custom colour's, at every whole degree", () => {
    for (let h = 0; h < 360; h++) {
      const scope = customDay(h);
      const backing = colorOf("--glass-solidify-bg", scope);
      const gloss = colorOf("--glass-gloss-ink-tonal", scope);
      expect(backing.c, `h${h} backing`).toBeGreaterThanOrEqual(DELIVERS * Math.min(0.09 * 1.36, 0.92 * ceiling(92, h)));
      expect(gloss.c, `h${h} gloss`).toBeGreaterThanOrEqual(DELIVERS * Math.min(0.09 * 4.25, 0.95 * ceiling(97, h)));
    }
  });

  it("leaves the opaque card's floor on its own scale and cap", () => {
    /* The backing has its own scale now; the opaque card still reads --glass-opaque-c-scale (0.85) and its
       preset cap × 0.55. Pinned by value in the day snapshot too. */
    for (const tint of tinted) {
      const day = html(false, tint);
      const want = Math.min(
        numberOf("--glass-tint-c", day) * numberOf("--glass-opaque-c-scale", day),
        numberOf("--glass-opaque-c-max", day) * numberOf("--glass-opaque-cap-scale", day),
      );
      expect(colorOf("--glass-opaque-bg", day).c, tint).toBeCloseTo(want, 9);
    }
  });
});

describe("vibrant day: the day wash never clips", () => {
  it.each(presetNames())("%s keeps its wash inside 95% of its own hue's ceiling at its own wash lightness", (tint) => {
    const day = html(false, tint);
    const wash = colorOf("--glass-tint-wash", day);
    expect(wash.c, `C ${wash.c} at L${wash.l}`).toBeLessThanOrEqual((0.95 + SHARE_TOLERANCE) * ceiling(wash.l, wash.h) + 1e-9);
  });

  it("caps a custom colour at 95% of its own hue's L72 ceiling, at every whole degree and any chroma", () => {
    /* The reported case: nothing capped the day wash, so a custom colour asked up to twice its ceiling and
       clipped per channel (its hue drifted). */
    for (const c of [
      0.05,
      0.09,
      0.15,
    ]) {
      for (let h = 0; h < 360; h++) {
        const wash = colorOf("--glass-tint-wash", customDay(h, c));
        expect(wash.l).toBe(72);
        expect(wash.c, `c${c} h${h}`).toBeLessThanOrEqual((0.95 + SHARE_TOLERANCE) * ceiling(72, h));
        expect(wash.c, `c${c} h${h}: greyed`).toBeGreaterThanOrEqual(0.85 * Math.min(c * 2.5, 0.95 * ceiling(72, h)));
      }
    }
  });

  it("caps a consumer's re-tint scope (a tool card at alpha 0.35) on a default page the same way, past 360 too", () => {
    for (const h of [
      -90,
      30,
      110,
      205,
      268,
      430,
      630,
    ]) {
      const wash = colorOf("--glass-tint-wash", nestedDay(h, 0.15, 0.35));
      expect(wash.c, `h${h}`).toBeLessThanOrEqual((0.95 + SHARE_TOLERANCE) * ceiling(72, h));
      expect(wash.c).toBeCloseTo(dayWashCap(h), 9);
    }
  });
});

describe("vibrant day: the pale warm stone is exempt", () => {
  it("keeps its day backing, gloss and wash exactly as they were", () => {
    /* bfd0aff's values: it pins the flat caps it had (presets.css), so neither hue-following cap lifts it. */
    const day = html(false, "moonstone");
    const backing = colorOf("--glass-solidify-bg", day);
    expect([
      backing.l,
      backing.h,
      backing.a,
    ]).toEqual([
      92,
      75,
      1,
    ]);
    // 0.055 × 0.65, computed as the engine always computed it.
    expect(backing.c).toBeCloseTo(0.03575, 12);
    expect(colorOf("--glass-gloss-ink-tonal", day)).toEqual({
      l: 97,
      c: 0.013,
      h: 75,
      a: 1,
    });
    const wash = colorOf("--glass-tint-wash", day);
    expect([
      wash.l,
      wash.c,
      wash.h,
      wash.a,
    ]).toEqual([
      72,
      0.1175,
      75,
      0.18,
    ]);
  });

  it("and inside another preset's page, as it was there", () => {
    /* Its backing took 65% of the opaque cap it inherits, on the opaque floor's scale (0.92): inside an
       amethyst page (cap 0.065) that was 0.04225, and it still is. */
    const nested: ModelElement[] = [
      ...html(false, "amethyst"),
      {
        attrs: {
          "data-glass-tint": "moonstone",
        },
      },
    ];
    expect(colorOf("--glass-solidify-bg", nested).c).toBeCloseTo(Math.min(0.047 * 0.92, 0.065 * 0.65), 9);
    expect(colorOf("--glass-gloss-ink-tonal", nested).c).toBeCloseTo(0.013, 9);
  });
});
