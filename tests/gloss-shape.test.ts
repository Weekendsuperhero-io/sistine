/**
 * The crystal gloss's SHAPE (data-gloss-shape, engine.css block C): the bevel (unset or "bevel": a band
 * down from the top and a fainter one in from the leading edge) or the frame ("frame": one band, at one
 * alpha, in from all four edges, gone by --glass-gloss-reach-frame). The frame adds no layer: the top and
 * side bands run on to the far edges and end in --glass-gloss-edge-ink, the ink at alpha 0 in the bevel.
 */
import { describe, expect, it } from "vitest";
import { colorOf, computedVars, html, type ModelElement, numberOf } from "./theme-cascade";

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
      expect(top).toMatch(/min\(30%, 5rem\)/);
      expect(computedVars(bevel).get("--glass-gloss-side") ?? "").toMatch(/\/ 0\.22\)/);
    });

    it(`${mode}: the frame lights every edge at 0.3, out to 2rem`, () => {
      const frame = page(dark, {
        "data-gloss-shape": "frame",
      });
      expect(numberOf("--glass-gloss-edge-a", frame)).toBeCloseTo(0.3, 9);
      expect(colorOf("--glass-gloss-edge-ink", frame).a).toBeCloseTo(0.3, 9);
      const top = computedVars(frame).get("--glass-gloss-top") ?? "";
      expect(top).not.toMatch(/5rem/);
      expect(top).toMatch(/min\(30%, 2rem\)/);
      expect(computedVars(frame).get("--glass-gloss-side") ?? "").toMatch(/min\(25%, 2rem\)/);
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

    it(`${mode}: under the hue flavor the far edges take the sweep's other end`, () => {
      const hue = page(dark, {
        "data-gloss": "hue",
        "data-gloss-shape": "frame",
      });
      const tintH = numberOf("--glass-tint-h", hue);
      const span = numberOf("--glass-gloss-hue-span", hue);
      const far = colorOf("--glass-gloss-edge-ink", hue);
      expect(far.h).toBeCloseTo(tintH + span, 6);
      expect(far.a).toBeCloseTo(0.3, 9);
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
