/**
 * The crystal gloss's SHAPE (data-gloss-shape, engine.css block C): the bevel (unset or "bevel": a band
 * down from the top and a fainter one in from the leading edge) or the frame ("frame": one band, at one
 * alpha, in from all four edges, gone by --glass-gloss-reach-frame). The frame adds no layer: the top and
 * side bands run on to the far edges and end in --glass-gloss-edge-ink, the ink at alpha 0 in the bevel.
 * Every band falls off as the square of its depth, so where two meet at a corner they blend in a round.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorOf, computedVars, html, type ModelElement, numberOf } from "./theme-cascade";

const engineCss = readFileSync("app/theme/engine.css", "utf8");
const page = (dark: boolean, attrs: Record<string, string> = {}, tint = "amethyst"): ModelElement[] => {
  const [root] = html(dark, tint);
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
const section = (chain: ModelElement[], attrs: Record<string, string>): ModelElement[] => [
  ...chain,
  {
    attrs,
  },
];
const layers = (chain: ModelElement[], name: string) =>
  (
    computedVars(chain)
      .get(name)
      ?.match(/gradient\(/g) ?? []
  ).length;

describe("the gloss shape", () => {
  for (const dark of [
    false,
    true,
  ]) {
    const mode = dark ? "night" : "day";

    it(`${mode}: the bevel is the default, and its far edges are clear`, () => {
      const bevel = page(dark);
      expect(computedVars(bevel).has("--glass-gloss-edge-a"), "the frame's stops are invalid in the bevel").toBe(false);
      expect(colorOf("--glass-gloss-edge-ink", bevel).a).toBe(0);
      const top = computedVars(bevel).get("--glass-gloss-top") ?? "";
      expect(top).toMatch(/\/ 0\.4\)/);
      expect(top).toMatch(/min\(30%, 1rem\)/);
      expect(computedVars(bevel).get("--glass-gloss-side") ?? "").toMatch(/\/ 0\.22\)/);
    });

    it(`${mode}: the bevel's bands are 1rem deep, the top and the side alike`, () => {
      const bevel = page(dark);
      expect(computedVars(bevel).get("--glass-gloss-reach-top")).toBe("1rem");
      expect(computedVars(bevel).get("--glass-gloss-reach-side")).toBe("1rem");
      expect(computedVars(bevel).get("--glass-gloss-top-depth")).toBe("min(30%, 1rem)");
      expect(computedVars(bevel).get("--glass-gloss-side-depth")).toBe("min(25%, 1rem)");
      for (const name of [
        "--glass-gloss-top",
        "--glass-gloss-side",
      ]) {
        const band = computedVars(bevel).get(name) ?? "";
        expect(band, name).not.toMatch(/(?<![\d.])[35]rem/);
      }
      // Lustre keeps its own, deeper top: the narrowing is the crystal bevel's.
      expect(computedVars(bevel).get("--glass-lustre-top") ?? "").toMatch(/min\(32%, 5rem\)/);
    });

    /* THE CORNER: two bands laid over each other at the leading corner. A band that fell off in a straight
       line ended in a crease, and the two creases boxed the corner in. Each band now runs from the far edge
       to the near one and climbs its last segment, transparent to the ink, through a colour hint: CSS
       raises that segment's progress to the power ln 0.5 / ln h, so a hint at h = 0.7071 of it is the
       square, (1 − depth/reach)², which leaves zero flat. Two such bands sum to a level set of circles
       round the point a reach in from the corner: the light turns it in a round, with no line anywhere. */
    it(`${mode}: each band leaves zero flat, so the corner has no crease`, () => {
      for (const [name, axis, start] of [
        [
          "--glass-gloss-top",
          "--glass-gloss-top-depth",
          /^linear-gradient\(\s*to top,/,
        ],
        [
          "--glass-gloss-side",
          "--glass-gloss-side-depth",
          /^linear-gradient\(\s*calc\(-90deg \* 1\),/,
        ],
      ] as const) {
        const depth = computedVars(page(dark)).get(axis) ?? "";
        const band = computedVars(page(dark)).get(name) ?? "";
        expect(band, name).toMatch(start);
        const esc = depth.replace(/[()%]/g, (c) => `\\${c}`);
        expect(band, name).toMatch(new RegExp(`transparent calc\\(100% - ${esc}\\),\\s*calc\\(100% - ${esc} \\* 0\\.2929\\),\\s*oklch\\(`));
      }
      const h = 1 - 0.2929;
      expect(Math.log(0.5) / Math.log(h)).toBeCloseTo(2, 3);
    });

    it(`${mode}: the frame's far edges fall off as the square too, at thirds`, () => {
      const frame = page(dark, {
        "data-gloss-shape": "frame",
      });
      expect(computedVars(frame).get("--glass-gloss-edge-ink-mid") ?? "").toMatch(/ 44\.44%, transparent\)$/);
      expect(computedVars(frame).get("--glass-gloss-edge-ink-low") ?? "").toMatch(/ 11\.11%, transparent\)$/);
      expect((4 / 9) * 100).toBeCloseTo(44.44, 2);
      expect((1 / 9) * 100).toBeCloseTo(11.11, 2);
      const top = computedVars(frame).get("--glass-gloss-top") ?? "";
      const depth = (computedVars(frame).get("--glass-gloss-edge-depth-y") ?? "").replace(/[()%.*+/]/g, (c) => `\\${c}`);
      expect(top).toMatch(new RegExp(`calc\\(${depth} / 3\\),`));
      expect(top).toMatch(new RegExp(`calc\\(${depth} / 1\\.5\\),\\s*transparent ${depth},`));
    });

    it(`${mode}: the frame lights every edge at 0.3, from 0.5rem on a small surface to 2rem on a card`, () => {
      const frame = page(dark, {
        "data-gloss-shape": "frame",
      });
      expect(numberOf("--glass-gloss-edge-a", frame)).toBeCloseTo(0.3, 9);
      expect(colorOf("--glass-gloss-edge-ink", frame).a).toBeCloseTo(0.3, 9);
      const top = computedVars(frame).get("--glass-gloss-top") ?? "";
      expect(top).not.toMatch(/(?<![\d.])5rem/);
      expect(computedVars(frame).get("--glass-gloss-edge-depth-y")).toBe("min(30%, clamp(0.5rem, (100% - 6rem) / 4, 2rem))");
      expect(computedVars(frame).get("--glass-gloss-edge-depth-x")).toBe("min(25%, clamp(0.5rem, (100% - 16rem) / 4, 2rem))");
      expect(top).toMatch(/clamp\(0\.5rem, \(100% - 6rem\) \/ 4, 2rem\)/);
      expect(computedVars(frame).get("--glass-gloss-side") ?? "").toMatch(/clamp\(0\.5rem, \(100% - 16rem\) \/ 4, 2rem\)/);
      /* The rule at a few sizes (px, 1rem = 16px): a swatch, a button, a menu item, a small card, a card. */
      const reach = (len: number, share: number, from: number) => Math.min(share * len, Math.min(Math.max(8, (len - from) / 4), 32));
      expect(reach(96, 0.3, 96)).toBe(8); // a 96px-tall swatch: 0.5rem
      expect(reach(36, 0.3, 96)).toBe(8); // a button's height
      expect(reach(200, 0.25, 256)).toBe(8); // a menu item's width
      expect(reach(160, 0.3, 96)).toBe(16); // a 10rem-tall card: 1rem
      expect(reach(260, 0.3, 96)).toBe(32); // a 260px-tall card: 2rem
      expect(reach(420, 0.25, 256)).toBe(32); // and its 420px width
      expect(reach(20, 0.3, 96)).toBe(6); // a tiny control keeps the 30% share
      // The same ink near and far: one band around the card, not a bevel.
      const near = colorOf("--glass-gloss-ink-tonal", frame);
      const far = colorOf("--glass-gloss-edge-ink", frame);
      expect(far.l).toBeCloseTo(near.l, 9);
      expect(far.c).toBeCloseTo(near.c, 9);
    });

    it(`${mode}: the frame adds no layer to the crystal and chakra stacks`, () => {
      for (const stack of [
        "--crystal-stack-bg",
        "--glass-chakra-stack-bg",
      ]) {
        expect(
          layers(
            page(dark, {
              "data-gloss-shape": "frame",
            }),
            stack,
          ),
          stack,
        ).toBe(layers(page(dark), stack));
      }
    });

    it(`${mode}: a shape scoped below <html> recomposes, and a nested one replaces its ancestor's`, () => {
      const inBevel = section(page(dark), {
        "data-gloss-shape": "frame",
      });
      expect(colorOf("--glass-gloss-edge-ink", inBevel).a).toBeCloseTo(0.3, 9);
      expect(computedVars(inBevel).get("--crystal-stack-bg")).not.toBe(computedVars(page(dark)).get("--crystal-stack-bg"));
      const inFrame = section(
        page(dark, {
          "data-gloss-shape": "frame",
        }),
        {
          "data-gloss-shape": "bevel",
        },
      );
      expect(computedVars(inFrame).has("--glass-gloss-edge-a")).toBe(false);
      expect(colorOf("--glass-gloss-edge-ink", inFrame).a).toBe(0);
      expect(computedVars(inFrame).get("--crystal-stack-bg")).toBe(computedVars(page(dark)).get("--crystal-stack-bg"));
    });

    it(`${mode}: under the hue flavor every edge fans the same sweep across its depth`, () => {
      const hue = page(dark, {
        "data-gloss": "hue",
        "data-gloss-shape": "frame",
      });
      const tintH = numberOf("--glass-tint-h", hue);
      const span = numberOf("--glass-gloss-hue-span", hue);
      // Every edge starts at the sweep's near end, as the near bands do, ...
      const far = colorOf("--glass-gloss-edge-ink", hue);
      expect(far.h).toBeCloseTo(tintH - span, 6);
      expect(far.a).toBeCloseTo(0.3, 9);
      // ... the far edges fan to the far end at thirds: 5/9 and 8/9 of the way, (1 − (1 − d)²) ...
      const mid = colorOf("--glass-gloss-edge-ink-mid", hue);
      const low = colorOf("--glass-gloss-edge-ink-low", hue);
      expect(mid.h).toBeCloseTo(tintH - span + (2 * span * 5) / 9, 6);
      expect(low.h).toBeCloseTo(tintH - span + (2 * span * 8) / 9, 6);
      expect(mid.a).toBeCloseTo(0.3 * 0.4444, 9);
      expect(low.a).toBeCloseTo(0.3 * 0.1111, 9);
      // ... and the near bands climb from the far end at alpha 0, the hint squaring hue and alpha together.
      const from = colorOf("--glass-gloss-edge-from", hue);
      expect(from.h).toBeCloseTo(tintH + span, 6);
      expect(from.a).toBe(0);
      expect(engineCss).toMatch(
        /var\(--glass-gloss-edge-from\) calc\(100% - var\(--glass-gloss-top-hue-depth\)\),\s*calc\(100% - var\(--glass-gloss-top-hue-depth\) \* 0\.2929\),/,
      );
      expect(engineCss).toMatch(
        /var\(--glass-gloss-edge-from\) calc\(100% - var\(--glass-gloss-side-depth\)\),\s*calc\(100% - var\(--glass-gloss-side-depth\) \* 0\.2929\),/,
      );
      // In the bevel the near bands climb from the near end, so they keep one hue, as before.
      expect(
        colorOf(
          "--glass-gloss-edge-from",
          page(dark, {
            "data-gloss": "hue",
          }),
        ).h,
      ).toBeCloseTo(tintH - span, 6);
      expect(
        colorOf(
          "--glass-gloss-edge-ink",
          page(dark, {
            "data-gloss": "hue",
          }),
        ).a,
      ).toBe(0);
    });
  }
});
