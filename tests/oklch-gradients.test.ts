/**
 * The pure colour logic behind the backdrops — TST-1-4 and the band/seam work it belongs to.
 *
 * These started life in `scripts/check-units.mjs` as dependency-free node checks, because at the time
 * the repo had no test runner. It has one now, and keeping them outside it bought nothing while making
 * the coverage invisible to anything that scans for test files.
 *
 * Every case here is either behaviour that was observed breaking, or behaviour whose correctness is not
 * obvious from reading the code. None of it needs a DOM.
 */
import { describe, expect, it } from "vitest";
import { apcaContrast, bandedFrescoStops, formatOklch, type OklchColor, rampGradient, readableLightnessBand } from "@/lib/oklch-utils";

const SEED: OklchColor = {
  l: 72,
  c: 0.15,
  h: 300,
};
const MODES = [
  {
    name: "light",
    fg: "oklch(35% 0.15 300)",
    seed: {
      l: 72,
      c: 0.15,
      h: 300,
    } as OklchColor,
  },
  {
    name: "dark",
    fg: "oklch(96% 0.01 300)",
    seed: {
      l: 52,
      c: 0.15,
      h: 300,
    } as OklchColor,
  },
];
const stopsOf = (css: string) =>
  [
    ...css.matchAll(/oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/g),
  ].map((m) => ({
    l: +m[1],
    c: +m[2],
    h: +m[3],
  }));
/** Shortest angular distance, so 359° and 1° read as 2° apart rather than 358°. */
const hueDelta = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

describe("readableLightnessBand", () => {
  /* The ramps span their whole range by design — that is what makes them good swatches. As a
     full-bleed backdrop it put pure black at one edge of the viewport and pure white at the other, so
     a single solved foreground could only ever be legible at one end. */
  it.each(MODES)("$name: both edges clear the APCA target", ({ fg, seed }) => {
    const band = readableLightnessBand(fg, seed);
    const at = (l: number) =>
      Math.abs(
        apcaContrast(fg, {
          ...seed,
          l,
        }),
      );

    expect(band.lMin).toBeLessThan(band.lMax);
    expect(at(band.lMin)).toBeGreaterThanOrEqual(60);
    expect(at(band.lMax)).toBeGreaterThanOrEqual(60);
  });

  it.each(MODES)("$name: stops short of the achromatic extreme", ({ fg, seed }) => {
    /* L 0 and L 100 are the only two lightnesses that hold NO chroma, so running to them washes the
       tint out of one edge. Backing off costs no readability — that end is the high-contrast one. */
    const band = readableLightnessBand(fg, seed);
    expect([
      band.lMin,
      band.lMax,
    ]).not.toEqual([
      0,
      100,
    ]);
  });

  it("falls back to the full range when the target is unreachable", () => {
    /* A mid-lightness foreground clears 60 against nothing. Banding is a readability aid, not a gate —
       an empty band would collapse the gradient to a single colour. */
    expect(readableLightnessBand("oklch(55% 0.1 300)", SEED, 90)).toEqual({
      lMin: 0,
      lMax: 100,
    });
  });
});

describe("rampGradient", () => {
  const AXES = [
    "tonal",
    "hue",
    "lightness",
    "chroma",
  ] as const;
  const SHAPES = [
    "linear",
    "radial",
    "conic",
  ] as const;
  const matrix = MODES.flatMap(({ name, fg, seed }) =>
    AXES.flatMap((axis) =>
      SHAPES.map((shape) => ({
        name,
        fg,
        seed,
        axis,
        shape,
      })),
    ),
  );

  it.each(matrix)("$name/$axis/$shape stays inside the readable band", ({ fg, seed, axis, shape }) => {
    const band = readableLightnessBand(fg, seed);
    const stops = stopsOf(
      rampGradient(axis, seed, 5, {
        band,
        shape,
        angle: 90,
      }),
    );

    expect(stops.length).toBeGreaterThan(0);
    for (const s of stops) {
      expect(s.l).toBeGreaterThanOrEqual(band.lMin - 0.5);
      expect(s.l).toBeLessThanOrEqual(band.lMax + 0.5);
    }
  });

  it.each(matrix.filter((m) => m.shape === "conic"))("$name/$axis/conic closes its loop", ({ fg, seed, axis }) => {
    /* A conic wraps: whatever sits at 360° butts straight into 0°. An open ramp met its own opposite
       end at the twelve-o'clock line and drew a hard seam — at full range, white against black. */
    const band = readableLightnessBand(fg, seed);
    const stops = stopsOf(
      rampGradient(axis, seed, 5, {
        band,
        shape: "conic",
        angle: 90,
      }),
    );
    const first = stops[0];
    const last = stops.at(-1) as (typeof stops)[number];

    expect(Math.abs(last.l - first.l)).toBeLessThan(0.001);
    expect(Math.abs(last.c - first.c)).toBeLessThan(0.001);
    expect(hueDelta(last.h, first.h)).toBeLessThan(0.001);
  });

  it("is unchanged without a band — banding is opt-in", () => {
    /* The docs swatches call the same ramps and MUST keep showing the full range. */
    const ls = stopsOf(
      rampGradient("lightness", SEED, 5, {
        shape: "linear",
      }),
    ).map((s) => s.l);
    expect(Math.min(...ls)).toBe(0);
    expect(Math.max(...ls)).toBe(100);
  });
});

describe("bandedFrescoStops — TST-1-4", () => {
  /* Frescoes are authored as fixed multi-hue stops at one lightness and skip the ramp entirely, so
     they skip its banding and its conic loop-close too unless this applies them. */
  const FRESCO = [
    "oklch(72% 0.15 20)",
    "oklch(72% 0.15 200)",
    "oklch(72% 0.15 300)",
  ];
  const BAND = {
    lMin: 80,
    lMax: 90,
  };

  it("clamps lightness into the band", () => {
    for (const s of stopsOf(bandedFrescoStops(FRESCO, BAND, "linear"))) {
      expect(s.l).toBeGreaterThanOrEqual(BAND.lMin);
      expect(s.l).toBeLessThanOrEqual(BAND.lMax);
    }
  });

  it("preserves hue while clamping", () => {
    expect(stopsOf(bandedFrescoStops(FRESCO, BAND, "linear")).map((s) => s.h)).toEqual([
      20,
      200,
      300,
    ]);
  });

  it("leaves in-band lightness where it is", () => {
    /* A clamp, not a remap: a stop already inside the band must not move. */
    for (const s of stopsOf(
      bandedFrescoStops(
        FRESCO,
        {
          lMin: 60,
          lMax: 90,
        },
        "linear",
      ),
    ))
      expect(s.l).toBeCloseTo(72, 1);
  });

  it.each([
    "linear",
    "radial",
  ] as const)("%s does not close the loop", (shape) => {
    expect(bandedFrescoStops(FRESCO, BAND, shape).split(",")).toHaveLength(FRESCO.length);
  });

  it("conic closes the loop at 0–100%", () => {
    const parsed = [
      ...bandedFrescoStops(FRESCO, BAND, "conic").matchAll(/(oklch\([^)]*\))\s+([\d.]+)%/g),
    ].map((m) => ({
      css: m[1],
      pos: +m[2],
    }));
    expect(parsed).toHaveLength(FRESCO.length + 1);
    expect(parsed[0].css).toBe(parsed.at(-1)?.css);
    expect(parsed[0].pos).toBe(0);
    expect(parsed.at(-1)?.pos).toBe(100);
  });

  it("does not loop a single stop", () => {
    expect(
      bandedFrescoStops(
        [
          "oklch(72% 0.15 20)",
        ],
        BAND,
        "conic",
      ),
    ).not.toContain(",");
  });

  it("passes colours through untouched without a band", () => {
    expect(bandedFrescoStops(FRESCO, undefined, "linear")).toBe(FRESCO.join(", "));
  });

  it("preserves alpha through the clamp", () => {
    /* formatOklch takes alpha as a separate argument and only falls back to `color.alpha`, so the
       object spread inside bandedFrescoStops is the ONLY thing carrying it. Losing it would be silent
       and type-clean. */
    expect(
      bandedFrescoStops(
        [
          "oklch(72% 0.15 20 / 0.4)",
        ],
        BAND,
        "linear",
      ),
    ).toMatch(/\/ 0\.4\)/);
  });

  it("does not invent an alpha on opaque stops", () => {
    expect(
      bandedFrescoStops(
        [
          "oklch(72% 0.15 20)",
        ],
        BAND,
        "linear",
      ),
    ).not.toContain("/");
  });

  it("leaves an unparseable stop alone", () => {
    /* A fresco could carry a var() or a named colour; mangling it is worse than not banding it. */
    expect(
      bandedFrescoStops(
        [
          "var(--something)",
          "oklch(72% 0.15 20)",
        ],
        BAND,
        "linear",
      ),
    ).toMatch(/^var\(--something\)/);
  });

  it.each([
    "linear",
    "radial",
    "conic",
  ] as const)("handles an empty stop list (%s)", (shape) => {
    expect(bandedFrescoStops([], BAND, shape)).toBe("");
  });
});

describe("formatOklch", () => {
  it("emits a parseable oklch() — every case above parses its own output", () => {
    expect(formatOklch(SEED)).toMatch(/^oklch\([\d.]+% [\d.]+ [\d.]+\)$/);
  });
});
