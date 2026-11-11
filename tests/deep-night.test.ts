/**
 * Deep night: at night every tint's wash, the tonal gloss and the border go deep, so white text reads on
 * dark tint. By day nothing moves.
 *
 * Measured from the shipped CSS through tests/theme-cascade (the cascade, var() and the engine's math),
 * on <html> in each page mode with each preset, and on a preset scoped inside a dark page.
 *
 *   - Day is pinned to a snapshot of the tree BEFORE deep night (tests/fixtures/deep-night-day.json, taken
 *     from 18568e6's partials): the wash, the lustre wash, the tonal gloss, the edges, the three role fills,
 *     the focus ring and the text the fills carry, on every preset, by value. Regenerate it only for a
 *     deliberate day-mode change, from the tree it should describe:
 *       UPDATE_DAY_SNAPSHOT=1 THEME_ROOT=<a checkout's root> bun run test:dom tests/deep-night.test.ts
 *   - Night: the wash and the tonal gloss take the darker of their own lightness and the night depth
 *     (35), so a preset already deeper keeps its own (Onyx's wash, 16). The wash keeps its hue and stays
 *     inside sRGB at that depth: its cap follows the hue (tokens.css), so none is clipped and none is
 *     greyed to a shared number, and lib/oklch-utils' nightWashCap evaluates the same cap.
 *   - The night role tokens (edges, fills) sit where tokens.css places them and are reset at every tint
 *     scope, so a nested preset never inherits its page preset's night values.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { maxSrgbChroma, NIGHT_WASH_CAP, nightWashCap } from "@/lib/oklch-utils";
import { evaluate } from "../scripts/lib/css-math.mjs";
import { colorOf, computedVars as computedVarsOf, html, type ModelElement, numberOf, presetNames, type ResolvedOklch } from "./theme-cascade";

const SNAPSHOT = "tests/fixtures/deep-night-day.json";
const NIGHT_DEPTH = 35;
/** The tokens deep night touches, and the shipped day value of each one. */
const TOKENS = {
  wash: "--glass-tint-wash",
  lustreWash: "--glass-lustre-tint-wash",
  gloss: "--glass-gloss-ink-tonal",
  border: "--border",
  input: "--input",
  accent: "--accent",
  secondary: "--secondary",
  muted: "--muted",
  ring: "--ring",
  sidebarRing: "--sidebar-ring",
  accentForeground: "--accent-foreground",
  secondaryForeground: "--secondary-foreground",
} as const;
type Surfaces = Record<keyof typeof TOKENS, ResolvedOklch>;

const round = (n: number) => Math.round(n * 1e6) / 1e6;
const surfaces = (chain: ModelElement[]): Surfaces =>
  Object.fromEntries(
    Object.entries(TOKENS).map(([key, token]) => {
      const c = colorOf(token, chain);
      return [
        key,
        {
          l: round(c.l),
          c: round(c.c),
          h: round(c.h),
          a: round(c.a),
        },
      ];
    }),
  ) as Surfaces;

/** The default tint (no attribute) and every named preset, jewels, frescoes and status tints alike. */
const SCOPES: Array<string | undefined> = [
  undefined,
  ...presetNames(),
];
const label = (tint: string | undefined) => tint ?? "(default)";

describe("deep night: day is unchanged", () => {
  const day = Object.fromEntries(
    SCOPES.map((t) => [
      label(t),
      surfaces(html(false, t)),
    ]),
  );
  if (process.env.UPDATE_DAY_SNAPSHOT === "1") writeFileSync(SNAPSHOT, `${JSON.stringify(day, null, 2)}\n`);
  const before = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Record<string, Surfaces>;

  it("covers every preset the snapshot was taken over", () => {
    expect(Object.keys(day).sort()).toEqual(Object.keys(before).sort());
  });

  it.each(SCOPES.map(label))("%s: the day wash, gloss, edges, fills and ring equal their values before deep night", (name) => {
    expect(day[name]).toEqual(before[name]);
  });

  it("leaves the night depth at 100 by day, so the min never binds", () => {
    for (const t of SCOPES) expect(numberOf("--glass-night-depth", html(false, t)), label(t)).toBe(100);
  });
});

describe("deep night: night goes deep", () => {
  it.each(SCOPES.map(label))("%s: the night wash and tonal gloss sit at the darker of their own lightness and 35", (name) => {
    const tint = name === "(default)" ? undefined : name;
    const night = html(true, tint);
    const own = numberOf("--glass-wash-l", night);
    const wash = colorOf(TOKENS.wash, night);
    expect(wash.l, "the night wash is no lighter than the depth").toBeLessThanOrEqual(NIGHT_DEPTH);
    expect(wash.l, "the darker of its own lightness and the depth").toBeCloseTo(Math.min(own, NIGHT_DEPTH), 6);
    expect(colorOf(TOKENS.lustreWash, night).l).toBeCloseTo(wash.l, 6);
    const glossOwn = numberOf("--glass-gloss-l", night);
    expect(colorOf(TOKENS.gloss, night).l).toBeCloseTo(Math.min(glossOwn, NIGHT_DEPTH), 6);
  });

  it("keeps Onyx's own deeper wash (16), rather than lifting it to the depth", () => {
    expect(colorOf(TOKENS.wash, html(true, "onyx")).l).toBeCloseTo(16, 6);
    expect(colorOf(TOKENS.wash, html(false, "onyx")).l).toBeCloseTo(16, 6);
  });

  it.each(SCOPES.map(label))("%s: the night wash keeps its hue, inside sRGB, at its own hue's ceiling", (name) => {
    const tint = name === "(default)" ? undefined : name;
    const night = html(true, tint);
    const wash = colorOf(TOKENS.wash, night);
    const ask = numberOf("--glass-tint-c", night) * numberOf("--glass-wash-c-mult", night);
    const ceiling = maxSrgbChroma(wash.l, wash.h);
    expect(wash.h, "hue kept").toBeCloseTo(numberOf("--glass-tint-h", night), 6);
    expect(wash.c, `C ${wash.c} against the L${wash.l} ceiling ${ceiling.toFixed(4)}: clipped`).toBeLessThanOrEqual(ceiling);
    /* Not greyed: a preset asks for colour, and gets all of it its hue can hold at this depth. A shared
       cap sized for the tightest hue would deliver lapis a quarter of its ceiling. */
    expect(wash.c, `C ${wash.c}: greyed below its own ceiling ${ceiling.toFixed(4)} (ask ${ask.toFixed(4)})`).toBeGreaterThanOrEqual(
      0.95 * Math.min(ask, ceiling),
    );
  });

  it("deepens a preset scoped inside a dark page the same way", () => {
    for (const tint of presetNames()) {
      const scoped: ModelElement[] = [
        ...html(true),
        {
          attrs: {
            "data-glass-tint": tint,
          },
        },
      ];
      expect(colorOf(TOKENS.wash, scoped), tint).toEqual(colorOf(TOKENS.wash, html(true, tint)));
    }
  });
});

/** <html class="dark"> with a custom colour inline, the way the switcher applies one (hue, chroma, alpha). */
const customNight = (h: number, c = 0.09, parentTint?: string): ModelElement[] => [
  ...html(true, parentTint),
  {
    attrs: {
      "data-glass-tint": "",
    },
    style: {
      "--glass-tint-h": String(h),
      "--glass-tint-c": String(c),
      "--glass-tint-a": "0.5",
    },
  },
];

describe("deep night: the night wash cap follows the hue", () => {
  it("evaluates, in CSS, to exactly lib/oklch-utils' nightWashCap from -720 to 1080", () => {
    /* The mirror AutoForeground models a custom colour's wash with. A drag's snapshot carries only the
       hue, so if the two drift, text is solved against a wash the browser does not paint. Past 0–360 on
       purpose: the harmonic hues are the theme's plus up to 270, and a consumer tints scopes with them. */
    /* The cascade once, with the hue left as a placeholder, then the substituted expression at every tenth of
       a degree (resolving the cascade 18,000 times would take minutes). */
    const expr = computedVarsOf(customNight("HUE" as unknown as number)).get("--glass-wash-c-max");
    if (!expr) throw new Error("--glass-wash-c-max does not compute on a custom night scope");
    for (let tenth = -7200; tenth <= 10800; tenth++) {
      const h = tenth / 10;
      expect(evaluate(expr.replaceAll("HUE", String(h))).v, `h${h}`).toBeCloseTo(nightWashCap(h), 9);
    }
    // And the full cascade agrees with the placeholder route at a few hues.
    for (const h of [
      -500,
      0,
      264.2,
      430,
      999,
    ])
      expect(numberOf("--glass-wash-c-max", customNight(h)), `h${h}`).toBeCloseTo(nightWashCap(h), 9);
  });

  it("never passes the L35 sRGB ceiling, and holds at least 90% of it at every whole degree, at any hue", () => {
    let lo = Number.POSITIVE_INFINITY;
    for (let h = -720; h <= 1080; h++) {
      const cap = nightWashCap(h);
      const ceiling = maxSrgbChroma(NIGHT_DEPTH, ((h % 360) + 360) % 360);
      expect(cap, `h${h}: past the ceiling`).toBeLessThanOrEqual(ceiling);
      lo = Math.min(lo, cap / ceiling);
    }
    expect(lo).toBeGreaterThanOrEqual(0.9);
  });

  it("keeps a harmonic hue past 360 coloured: a tool card at theme 250 + 180 = 430 is h70", () => {
    /* The reported case: the tint hue is a harmony hue the consumer did not wrap. Before the wrap every
       tangent was negative out here and the cap clamped the wash to chroma 0. */
    const card = colorOf(TOKENS.wash, customNight(430, 0.07));
    expect(card.c).toBeCloseTo(Math.min(0.07 * 2.5, nightWashCap(70)), 9);
    expect(card.c).toBeGreaterThan(0.06);
    for (const h of [
      -120,
      -96,
      390,
      420,
      630,
      750,
    ]) {
      expect(nightWashCap(h), `h${h}`).toBeGreaterThanOrEqual(0.057);
      expect(nightWashCap(h), `h${h} is h${h - 360 * Math.floor(h / 360)}`).toBeCloseTo(nightWashCap(h - 360 * Math.floor(h / 360)), 5);
    }
  });

  it("gives a custom colour its own hue's cap, not a shared number, even inside a preset page", () => {
    /* A custom blue at h268 holds 0.2268 at L35; the old flat guard (0.057) delivered a quarter of it. A
       1° drag off lapis makes it a custom tint, and its wash must not fall from 0.2125 to that. */
    const blue = colorOf(TOKENS.wash, customNight(267, 0.085));
    expect(blue.c).toBeCloseTo(0.2125, 6);
    /* Inside a lapis page, a scoped custom cyan takes its own hue's cap, never lapis's wider one. */
    const cyan = colorOf(TOKENS.wash, customNight(190, 0.09, "lapis"));
    expect(cyan.c).toBeCloseTo(nightWashCap(190), 9);
    expect(cyan.c).toBeLessThanOrEqual(maxSrgbChroma(NIGHT_DEPTH, 190));
  });

  it("is generated as three tangent arcs cut at the three cusps", () => {
    // The structure tokens.css and the fit script document; a reshaped table should say so here first.
    expect(NIGHT_WASH_CAP.groups.length).toBe(4);
    expect(NIGHT_WASH_CAP.cut).toBe(20);
    expect(NIGHT_WASH_CAP.floor).toBe(0.057);
  });
});

describe("deep night: the night role tokens", () => {
  /* Placed against the deep floor (tokens.css, the night token rule); scripts/check-contrast.mjs [edge] and
     [role] hold what they measure, this pins where they sit. Onyx (an L16 floor) and moonstone (L41–46)
     state their own. */
  const NIGHT_L: Record<string, Partial<Record<"border" | "input" | "accent" | "secondary" | "muted", number>>> = {
    "": {
      border: 65,
      input: 65,
      accent: 45,
      secondary: 44,
      muted: 24,
    },
    onyx: {
      border: 61,
      input: 61,
      accent: 28,
      secondary: 24,
      muted: 24,
    },
    moonstone: {
      border: 72,
      input: 72,
      accent: 33,
      secondary: 33,
      muted: 33,
    },
  };
  const expected = (t: string | undefined, role: "border" | "input" | "accent" | "secondary" | "muted") =>
    NIGHT_L[t ?? ""]?.[role] ?? (NIGHT_L[""][role] as number);

  it.each(SCOPES.map(label))("%s: the edges and fills sit where the night places them", (name) => {
    const t = name === "(default)" ? undefined : name;
    for (const role of [
      "border",
      "input",
      "accent",
      "secondary",
      "muted",
    ] as const) {
      expect(colorOf(TOKENS[role], html(true, t)).l, `${name} ${role}`).toBeCloseTo(expected(t, role), 6);
    }
  });

  it("puts the strong ink on the night accent and secondary fills, and a lit ring on the deep floor", () => {
    const night = computedVarsOf(html(true, "lapis"));
    expect(night.get("--accent-foreground")).toBe(night.get("--foreground-strong"));
    expect(night.get("--secondary-foreground")).toBe(night.get("--foreground-strong"));
    expect(colorOf(TOKENS.ring, html(true, "lapis")).l).toBeCloseTo(70, 6);
    expect(colorOf(TOKENS.ring, html(true, "lapis")).c).toBeLessThanOrEqual(maxSrgbChroma(70, 250));
  });

  it("resets them at every tint scope, so a nested preset never takes its page preset's night values", () => {
    const nested = (page: string, section: string): ModelElement[] => [
      ...html(true, page),
      {
        attrs: {
          "data-glass-tint": section,
        },
      },
    ];
    for (const [page, section] of [
      [
        "moonstone",
        "lapis",
      ],
      [
        "onyx",
        "aventurine",
      ],
      [
        "lapis",
        "moonstone",
      ],
      [
        "lapis",
        "onyx",
      ],
      [
        "moonstone",
        "onyx",
      ],
    ]) {
      for (const role of [
        "border",
        "input",
        "accent",
        "secondary",
        "muted",
      ] as const) {
        expect(colorOf(TOKENS[role], nested(page, section)).l, `${section} inside a ${page} page: ${role}`).toBeCloseTo(expected(section, role), 6);
      }
    }
  });

  it("leaves day's nesting as it was: a section inside an Onyx page still inherits Onyx's day edges", () => {
    /* Day is out of scope by mandate, inheritance included: by day nothing resets, as before deep night. */
    const lapisInOnyx: ModelElement[] = [
      ...html(false, "onyx"),
      {
        attrs: {
          "data-glass-tint": "lapis",
        },
      },
    ];
    expect(colorOf(TOKENS.border, lapisInOnyx).l).toBeCloseTo(38, 6);
    expect(colorOf(TOKENS.input, lapisInOnyx).l).toBeCloseTo(30, 6);
  });
});
