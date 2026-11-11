/**
 * Deep night: at night every tint's wash, the tonal gloss and the border go deep, so white text reads on
 * dark tint. By day nothing moves.
 *
 * Measured from the shipped CSS through tests/theme-cascade (the cascade, var() and the engine's math),
 * on <html> in each page mode with each preset, and on a preset scoped inside a dark page.
 *
 *   - Day is pinned to a snapshot taken BEFORE deep night landed (tests/fixtures/deep-night-day.json):
 *     the wash, the lustre wash, the tonal gloss, the border and the input edge of every preset, by value.
 *     Regenerate it only for a deliberate day-mode change: UPDATE_DAY_SNAPSHOT=1 bun run test:dom.
 *   - Night: the wash and the tonal gloss take the darker of their own lightness and the night depth
 *     (35), so a preset already deeper keeps its own (Onyx's wash, 16). The wash keeps its hue and stays
 *     inside sRGB at that depth: each preset caps its own chroma at its hue's ceiling, so none is clipped
 *     and none is greyed to a shared number.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { maxSrgbChroma } from "@/lib/oklch-utils";
import { colorOf, html, type ModelElement, numberOf, presetNames, type ResolvedOklch } from "./theme-cascade";

const SNAPSHOT = "tests/fixtures/deep-night-day.json";
const NIGHT_DEPTH = 35;
/** The tokens deep night touches, and the shipped day value of each one. */
const TOKENS = {
  wash: "--glass-tint-wash",
  lustreWash: "--glass-lustre-tint-wash",
  gloss: "--glass-gloss-ink-tonal",
  border: "--border",
  input: "--input",
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

  it.each(SCOPES.map(label))("%s: the day wash, gloss and edges equal their values before deep night", (name) => {
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

  it("deepens a preset scoped inside a dark page the same way, and resets the chroma cap there", () => {
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
    /* An inline tint (the crystal demo's swatches: data-glass-tint="" plus raw h/c/a) inside a lapis page
       must not inherit lapis's cap, which is wider than most hues can hold at L35. */
    const swatch: ModelElement[] = [
      ...html(true, "lapis"),
      {
        attrs: {
          "data-glass-tint": "",
        },
      },
    ];
    expect(numberOf("--glass-wash-c-max", swatch)).toBe(numberOf("--glass-wash-c-max", html(true)));
  });
});

describe("deep night: the border", () => {
  /* Onyx and moonstone pin their own night edge, because their night floors sit far from the L32 every
     other preset lands on (scripts/check-contrast.mjs [edge] holds the contrast; this pins the values). */
  const OWN_NIGHT_EDGE: Record<string, number> = {
    onyx: 61,
    moonstone: 72,
  };

  it("lifts the night border to L65, with Onyx and moonstone at their own night values", () => {
    for (const t of SCOPES) {
      expect(colorOf(TOKENS.border, html(true, t)).l, label(t)).toBeCloseTo(OWN_NIGHT_EDGE[t ?? ""] ?? 65, 6);
    }
  });

  it("leaves the input edge where it was (L25 at night; Onyx's own 30)", () => {
    for (const t of SCOPES) {
      expect(colorOf(TOKENS.input, html(true, t)).l, label(t)).toBeCloseTo(t === "onyx" ? 30 : 25, 6);
    }
  });
});
