/**
 * The crystal gloss's SHAPE (data-gloss-shape, engine.css block C): the bevel (unset or "bevel": a band
 * down from the top and a fainter one in from the leading edge) or the frame ("frame": one band, at one
 * alpha, in from all four edges, gone by --glass-gloss-reach-frame). The frame adds no layer: the top and
 * side bands run on to the far edges and end in --glass-gloss-edge-ink, the ink at alpha 0 in the bevel.
 * Every band falls off as the square of its depth, so where two meet at a corner they blend in a round.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alphaAt, coverage, type Layer, resolveLayer, rowsLit } from "./gloss-model";
import { colorOf, computedVars, html, type ModelElement, numberOf } from "./theme-cascade";

const engineCss = readFileSync("app/theme/engine.css", "utf8");
const registrationsCss = readFileSync("app/theme/registrations.css", "utf8");
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
/** A computed value on one line: a declaration the formatter broke over lines computes with its line breaks. */
const flat = (value: string | undefined) => value?.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
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
      expect(flat(computedVars(frame).get("--glass-gloss-edge-depth-y"))).toBe("min(30%, clamp(0.5rem, (100% - 6rem) / 4, 2rem))");
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

    /* A SMALL CONTROL under the white flavor (HERO, 2026-11-23: small controls whited out under it on night glass):
       every share binds on a control before its length does, so there the shine is sized to the control. The
       streak fades out by the least of its share, its reach and a ramp from nothing along its diagonal, Lustre's
       sheen goes under a 15rem diagonal (a cut past its band), the glow's centre, Crystal's and Lustre's, sinks
       below a surface under 6rem tall, and the frame's top and bottom thin to 0.25rem. The other flavors keep
       their shares at every size, and a card under the white one draws what it drew (tests/gloss-snapshot). */
    it(`${mode}: under the white flavor the shine is sized to the control, and the other flavors keep their shares`, () => {
      const white = computedVars(
        page(dark, {
          "data-gloss": "white",
        }),
      );
      const whiteFrame = computedVars(
        page(dark, {
          "data-gloss": "white",
          "data-gloss-shape": "frame",
        }),
      );
      expect(white.get("--glass-gloss-streak-depth")).toBe("min((100% - 10rem) * 1.5 * 1, 50%, 16rem)");
      expect(white.get("--glass-gloss-glow-y")).toBe("max(120%, 100% + (6rem - 100%) * 10 * 1)");
      expect(white.get("--glass-gloss-glow-depth")).toBe("min(70%, 14rem)");
      expect(white.get("--glass-lustre-streak-cut")).toBe("calc((15rem - 100%) * 1000 * 1)");
      expect(flat(whiteFrame.get("--glass-gloss-edge-depth-y"))).toBe(
        "min(30%, clamp(clamp(0.25rem, calc(0.5rem - (6rem - 100%) / 6 * 1 * 1), 0.5rem), (100% - 6rem) / 4, 2rem))",
      );
      // In the bevel the frame's depth is the card's: the thinner band is the frame's alone.
      expect(flat(white.get("--glass-gloss-edge-depth-y"))).toBe("min(30%, clamp(0.5rem, (100% - 6rem) / 4, 2rem))");
      // Its sides keep 0.5rem: their band knows only the width, which cannot tell a button from a narrow panel.
      expect(whiteFrame.get("--glass-gloss-edge-depth-x")).toBe("min(25%, clamp(0.5rem, (100% - 16rem) / 4, 2rem))");
      // The layers read them, Lustre's glow Crystal's two and its sheen the cut.
      expect(white.get("--glass-gloss-streak") ?? "").toMatch(/transparent min\(\(100% - 10rem\) \* 1\.5 \* 1, 50%, 16rem\)\s*\)$/);
      for (const glow of [
        "--glass-gloss-glow",
        "--glass-lustre-glow",
      ])
        expect(white.get(glow) ?? "", glow).toMatch(
          /^radial-gradient\(circle at 50% max\(120%, 100% \+ \(6rem - 100%\) \* 10 \* 1\), [\s\S]* transparent min\(70%, 14rem\)\)$/,
        );
      expect(white.get("--glass-lustre-streak") ?? "").toMatch(
        /transparent 32%,\s*transparent calc\(\(15rem - 100%\) \* 1000 \* 1\),\s*oklch\([\s\S]*?\/ 0\.16\) 48%,\s*transparent 64%\s*\)$/,
      );
      // Registered lengths, so each stack carries one token for each (check-theme [token-budget]).
      for (const name of [
        "--glass-gloss-streak-depth",
        "--glass-gloss-glow-depth",
        "--glass-gloss-glow-y",
        "--glass-lustre-streak-cut",
      ])
        expect(registrationsCss, name).toMatch(new RegExp(`@property ${name} \\{\\s*syntax: "<length-percentage>";`));
      // The tonal flavor (the default) and the hue flavor keep the shares they were drawn with, at every size.
      for (const flavor of [
        {} as Record<string, string>,
        {
          "data-gloss": "hue",
          "data-gloss-shape": "frame",
        },
      ]) {
        const other = computedVars(page(dark, flavor));
        expect(other.get("--glass-gloss-streak-depth")).toBe("min(50%, 16rem)");
        expect(other.get("--glass-gloss-glow-y")).toBe("120%");
        expect(other.get("--glass-lustre-streak-cut")).toBe("0%");
        expect(flat(other.get("--glass-gloss-edge-depth-y"))).toBe("min(30%, clamp(0.5rem, (100% - 6rem) / 4, 2rem))");
      }
      expect(computedVars(page(dark)).get("--glass-lustre-streak") ?? "").toMatch(/transparent 32%,\s*transparent 0%,/);
      // The bevel's bands, and Lustre's top, keep their reach: that light at the edge is the rim.
      expect(white.get("--glass-gloss-top-depth")).toBe("min(30%, 1rem)");
      expect(white.get("--glass-gloss-side-depth")).toBe("min(25%, 1rem)");
      expect(white.get("--glass-lustre-top") ?? "").toMatch(/min\(32%, 5rem\)\)$/);
    });

    /* Laid on the controls themselves (tests/gloss-model: each computed layer at a size, every stop in px), the
       white flavor's small control keeps its rim and nothing more, in each style that wears the gloss: Crystal and
       Chakra (one gloss, baked into both stacks) and Lustre (its own polish, the same white ink). */
    for (const style of [
      "crystal",
      "chakra",
      "lustre",
    ] as const)
      for (const shape of [
        "bevel",
        "frame",
      ])
        it(`${mode}: ${style} under the white flavor, ${shape}: a small control keeps its rim, and its face is clear`, () => {
          const vars = computedVars(
            page(dark, {
              "data-gloss": "white",
              "data-gloss-shape": shape,
            }),
          );
          const names =
            style === "lustre"
              ? {
                  top: "--glass-lustre-top",
                  glow: "--glass-lustre-glow",
                  streak: "--glass-lustre-streak",
                }
              : {
                  top: "--glass-gloss-top",
                  side: "--glass-gloss-side",
                  glow: "--glass-gloss-glow",
                  streak: "--glass-gloss-streak",
                };
          // The style's stack bakes exactly these layers, in this order.
          const stack =
            vars.get(
              {
                crystal: "--crystal-stack-bg",
                chakra: "--glass-chakra-stack-bg",
                lustre: "--glass-lustre-polish-bg",
              }[style],
            ) ?? "";
          expect(
            stack.startsWith(
              Object.values(names)
                .map((n) => vars.get(n))
                .join(", "),
            ),
            `${style}'s stack`,
          ).toBe(true);
          const at = (name: string, w: number, h: number): Layer => {
            const layer = resolveLayer(vars.get(name) ?? "", w, h);
            if (!layer) throw new Error(`${name} does not draw`);
            return layer;
          };
          for (const [control, w, h] of [
            [
              "a badge",
              70,
              20,
            ],
            [
              "a button",
              90,
              32,
            ],
            [
              "an icon button",
              32,
              32,
            ],
            [
              "a segmented control",
              130,
              42,
            ],
            [
              "a dial",
              52,
              52,
            ],
          ] as const) {
            // The streak (or Lustre's sheen) and the glow draw nothing on its face.
            expect(
              coverage(
                [
                  at(names.streak, w, h),
                ],
                w,
                h,
              ).max,
              `${control}: the streak`,
            ).toBe(0);
            expect(
              coverage(
                [
                  at(names.glow, w, h),
                ],
                w,
                h,
              ).max,
              `${control}: the glow`,
            ).toBe(0);
            // What is left is the rim: across the middle third, where the words are, only the leading edge's band.
            const face = Object.values(names).map((n) => at(n, w, h));
            const middle = coverage(face, w, h).middle;
            if (style === "lustre") expect(middle, `${control}: the middle third`).toBe(0);
            else
              expect(middle, `${control}: the middle third`).toBeCloseTo(
                coverage(
                  [
                    at(names.side as string, w, h),
                  ],
                  w,
                  h,
                ).middle,
                12,
              );
            // The frame: its top and bottom four rows each (0.25rem), its sides eight columns each (0.5rem, or a quarter
            // of a narrow control's width).
            if (style !== "lustre" && shape === "frame") {
              expect(rowsLit(at(names.top, w, h), w, h), `${control}: the frame's top and bottom`).toBe(8);
              const side = at(names.side as string, w, h);
              let columns = 0;
              for (let i = 0; i < w; i++) if (alphaAt(side, i + 0.5, h / 2) > 0) columns++;
              expect(columns, `${control}: the frame's sides`).toBe(2 * Math.min(8, Math.ceil(w / 4 - 0.5)));
            }
          }
          // A card keeps them all: on a 20rem × 12.5rem card the streak, the glow and the sheen are whole.
          for (const layer of [
            names.streak,
            names.glow,
          ])
            expect(
              coverage(
                [
                  at(layer, 320, 200),
                ],
                320,
                200,
              ).max,
              `a card: ${layer}`,
            ).toBeGreaterThan(0.1);
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
