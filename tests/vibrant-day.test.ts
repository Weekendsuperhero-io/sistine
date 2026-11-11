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
  DAY_BACKING_CAP_DARK,
  DAY_GLOSS_CAP,
  DAY_WASH_CAP,
  dayBackingCap,
  dayGlossCap,
  dayWashCap,
  type HueCapTable,
  maxSrgbChroma,
} from "@/lib/oklch-utils";
import { compile } from "../scripts/lib/css-math.mjs";
import { expectAtMost, expectWithin, worstDifference, worstValue } from "./sweep";
import { colorOf, compileOklch, computedVars, html, type ModelElement, numberOf, presetNames } from "./theme-cascade";

const ceiling = (l: number, h: number) => maxSrgbChroma(l, ((h % 360) + 360) % 360);

/** <html> by day with a custom colour inline (hue, chroma, alpha), the way the switcher applies one. */
const customDay = (h: number | string, c: number | string = 0.09, a = 0.5): ModelElement[] => [
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
const nestedDay = (h: number | string, c: number | string, a: number, page?: string): ModelElement[] => [
  ...html(false, page),
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

/* Sweeps resolve the cascade ONCE per scope shape, with the swept values left as placeholders (HUE, C, L),
   and evaluate the compiled expression at each sample (scripts/lib/css-math compile, held to evaluate by
   tests/css-math.test.ts): re-resolving or re-parsing per sample is what made them take seconds. */
/** A token of `chain`, compiled with `names` as placeholders. */
const compiledToken = (chain: ModelElement[], token: string, names: string[]) => {
  const raw = computedVars(chain).get(token);
  if (!raw) throw new Error(`${token} does not compute on this scope`);
  return compile(raw, names);
};
/** A colour token of `chain`, compiled per channel with `names` as placeholders. */
const compiledColor = (chain: ModelElement[], token: string, names: string[]) => {
  const raw = computedVars(chain).get(token);
  if (!raw) throw new Error(`${token} does not compute on this scope`);
  return compileOklch(raw, names);
};
/* Every sweep asserts once, on the worst sample, through tests/sweep: NaN-safe, and every compared value is
   asserted finite. A threshold collected sample by sample is written as the negation of its passing
   condition (`!(c <= bound)`), which is true on NaN, so a NaN fails it rather than slipping past. */

const CAPS: Array<{
  token: string;
  table: HueCapTable;
  mirror: (h: number) => number;
  l: number;
  share: number;
}> = [
  {
    token: "--glass-solidify-c-max-at-92",
    table: DAY_BACKING_CAP,
    mirror: (h) => dayBackingCap(h, 92),
    l: 92,
    share: 0.92,
  },
  {
    token: "--glass-solidify-c-max-at-18",
    table: DAY_BACKING_CAP_DARK,
    mirror: (h) => dayBackingCap(h, 18),
    l: 18,
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
    /* The cascade once, with the hue left as a placeholder, then the compiled expression at every tenth of a
       degree and every ten-thousandth near the breakpoints, held to toBeCloseTo(…, 9)'s bound at the worst. */
    const css = compiledToken(customDay("HUE"), cap.token, [
      "HUE",
    ]);
    const hues = [
      ...Array.from(
        {
          length: 18001,
        },
        (_, i) => (i - 7200) / 10,
      ),
      ...breakpointSamples(cap.table),
    ];
    expectWithin(
      worstDifference(
        hues,
        (h) =>
          css({
            HUE: h,
          }).v,
        cap.mirror,
      ),
      5e-10,
      `${cap.token}: CSS and the mirror`,
    );
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
    const hues = [
      ...Array.from(
        {
          length: 3601,
        },
        (_, i) => -720 + i / 2,
      ),
      ...breakpointSamples(cap.table),
    ];
    expectAtMost(
      worstValue(hues, (h) => cap.mirror(h) / ceiling(cap.l, h)),
      cap.share + SHARE_TOLERANCE,
      `${cap.token}: the cap's share of the ceiling`,
    );
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
    const backingAt = compiledColor(customDay("HUE"), "--glass-solidify-bg", [
      "HUE",
    ]);
    const glossAt = compiledColor(customDay("HUE"), "--glass-gloss-ink-tonal", [
      "HUE",
    ]);
    const short: string[] = [];
    for (let h = 0; h < 360; h++) {
      const backing = backingAt({
        HUE: h,
      });
      const gloss = glossAt({
        HUE: h,
      });
      if (!(backing.c >= DELIVERS * Math.min(0.09 * 1.36, 0.92 * ceiling(92, h)))) short.push(`h${h} backing ${backing.c.toFixed(4)}`);
      if (!(gloss.c >= DELIVERS * Math.min(0.09 * 4.25, 0.95 * ceiling(97, h)))) short.push(`h${h} gloss ${gloss.c.toFixed(4)}`);
    }
    expect(short).toEqual([]);
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

describe("vibrant day: the backing is capped at the lightness it paints", () => {
  /* Every preset's day backing is L92, but a scope keeps the --glass-solidify-l it inherits: a section inside
     the near-black preset's page paints its backing at L18, where a cap fitted at L92 asked up to 3.5× what
     sRGB holds. The cap blends its L92 and L18 fits by that lightness (tokens.css). */
  const sections = presetNames();
  const customs = Array.from(
    {
      length: 36,
    },
    (_, i) => i * 10,
  );
  /* Held to the backing's 92% share; the pale warm stone keeps the cap it had (its exemption), which on the
     near-black page is 95% of its L18 ceiling, under the ceiling itself, exactly as before. Each page is
     swept once and its result shared by the tests below: every preset scoped inside it (the cascade per
     section, its page resolved once), and custom colours (a consumer's re-tint) at every 10° and two
     chromas, from one cascade with the hue and chroma left as placeholders. */
  const swept = new Map<string, string[]>();
  const holds = (page: string) => {
    let over = swept.get(page);
    if (!over) {
      over = [];
      const check = (
        name: string,
        backing: {
          l: number;
          c: number;
          h: number;
        },
      ) => {
        if (backing.c === 0) return;
        const ceil = ceiling(backing.l, backing.h);
        const share = name === "moonstone" ? 1 : 0.92 + SHARE_TOLERANCE;
        if (!(backing.c <= share * ceil))
          over?.push(`${name}: C ${backing.c.toFixed(4)} at L${backing.l}, ${((100 * backing.c) / ceil).toFixed(1)}% of the ceiling`);
      };
      for (const section of sections) {
        check(
          section,
          colorOf("--glass-solidify-bg", [
            ...html(false, page),
            {
              attrs: {
                "data-glass-tint": section,
              },
            },
          ]),
        );
      }
      const custom = compiledColor(nestedDay("HUE", "C", 0.35, page), "--glass-solidify-bg", [
        "HUE",
        "C",
      ]);
      for (const h of customs)
        for (const c of [
          0.09,
          0.15,
        ])
          check(
            `custom h${h} c${c}`,
            custom({
              HUE: h,
              C: c,
            }),
          );
      swept.set(page, over);
    }
    expect(over, `sections on a ${page} page past their share`).toEqual([]);
  };

  it("on the near-black preset's page (backing L18), for every section and custom hue", () => {
    expect(numberOf("--glass-solidify-l", html(false, "onyx"))).toBe(18);
    holds("onyx");
    // And the cap there is the L18 fit, not a greyed fallback: a custom teal gets what L18 holds at h190.
    const teal = colorOf("--glass-solidify-bg", nestedDay(190, 0.15, 0.35, "onyx"));
    expect(teal.c).toBeCloseTo(dayBackingCap(190, 18), 9);
    expect(teal.c).toBeGreaterThan(0.85 * 0.92 * ceiling(18, 190));
  });

  it("on every page whose backing is not at L92", () => {
    const pages = presetNames().filter((p) => numberOf("--glass-solidify-l", html(false, p)) !== 92);
    expect(pages.length, "no page paints its backing off L92: this sweep would test nothing").toBeGreaterThan(0);
    for (const page of pages) holds(page);
  });

  /* Every page, one test each: 27 sections and 72 custom colours per page, so no single test carries the
     whole sweep. */
  it.each(presetNames())("and on the %s page, for every section and custom hue", (page) => holds(page));

  it("evaluates, in CSS, to lib/oklch-utils' dayBackingCap at any backing lightness", () => {
    /* One cascade with both the hue and the backing lightness left as placeholders, compiled once. */
    const scope = customDay("HUE");
    scope[0].style = {
      ...scope[0].style,
      "--glass-solidify-l": "L",
    };
    const css = compiledToken(scope, "--glass-solidify-c-max", [
      "HUE",
      "L",
    ]);
    const hues = Array.from(
      {
        length: 1441,
      },
      (_, i) => -180 + i / 2,
    );
    for (const l of [
      0,
      9,
      18,
      30,
      52,
      75,
      92,
      96,
      100,
    ]) {
      expectWithin(
        worstDifference(
          hues,
          (h) =>
            css({
              HUE: h,
              L: l,
            }).v,
          (h) => dayBackingCap(h, l),
        ),
        5e-10,
        `L${l}: CSS and dayBackingCap`,
      );
    }
    // The full cascade, with the lightness a scope actually inherits, agrees with the placeholder route.
    expect(colorOf("--glass-solidify-bg", nestedDay(190, 0.15, 0.35, "onyx")).c).toBeCloseTo(Math.min(0.15 * 1.36, dayBackingCap(190, 18)), 12);
  });

  it("never passes the ceiling at any whole backing lightness, at every whole degree", () => {
    const over: string[] = [];
    for (let l = 0; l <= 100; l++) {
      for (let h = 0; h < 360; h++) {
        const ceil = ceiling(l, h);
        if (!(ceil < 0.005) && !(dayBackingCap(h, l) <= ceil)) over.push(`L${l} h${h}`);
      }
    }
    expect(over).toEqual([]);
  });
});

describe("vibrant day: the backing scale is reset at every tint scope", () => {
  it("a section on the pale warm stone's page takes the day scale, not the stone's own", () => {
    /* The stone keeps its old scale (its opaque floor's 0.92); a peridot section on its page must not inherit
       it. Peridot's backing is scale-bound (0.083 × 1.36 = 0.113, under its cap), so the scale shows. */
    const section: ModelElement[] = [
      ...html(false, "moonstone"),
      {
        attrs: {
          "data-glass-tint": "peridot",
        },
      },
    ];
    expect(numberOf("--glass-solidify-c-scale", section)).toBe(1.36);
    expect(colorOf("--glass-solidify-bg", section).c).toBeCloseTo(colorOf("--glass-solidify-bg", html(false, "peridot")).c, 9);
    expect(numberOf("--glass-solidify-c-scale", html(false, "moonstone"))).toBeCloseTo(0.92, 9);
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
    const washAt = compiledColor(customDay("HUE", "C"), "--glass-tint-wash", [
      "HUE",
      "C",
    ]);
    const wrong: string[] = [];
    for (const c of [
      0.05,
      0.09,
      0.15,
    ]) {
      for (let h = 0; h < 360; h++) {
        const wash = washAt({
          HUE: h,
          C: c,
        });
        if (wash.l !== 72) wrong.push(`c${c} h${h}: L${wash.l}`);
        if (!(wash.c <= (0.95 + SHARE_TOLERANCE) * ceiling(72, h))) wrong.push(`c${c} h${h}: C ${wash.c.toFixed(4)} past 95%`);
        if (!(wash.c >= 0.85 * Math.min(c * 2.5, 0.95 * ceiling(72, h)))) wrong.push(`c${c} h${h}: C ${wash.c.toFixed(4)} greyed`);
      }
    }
    expect(wrong).toEqual([]);
    // The full cascade agrees with the placeholder route at a few points.
    for (const [h, c] of [
      [
        30,
        0.15,
      ],
      [
        190,
        0.09,
      ],
      [
        268,
        0.05,
      ],
    ])
      expect(colorOf("--glass-tint-wash", customDay(h, c)).c).toBeCloseTo(
        washAt({
          HUE: h,
          C: c,
        }).c,
        12,
      );
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
