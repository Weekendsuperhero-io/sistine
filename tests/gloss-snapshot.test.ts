/**
 * A card and a panel draw the gloss they drew before small controls got their own, and the tonal and hue
 * flavors draw it at every size: only a small control under the white flavor changes (engine.css, the reach
 * comment in block A). Crystal, Chakra and Lustre, by day and at night, under every flavor and both shapes.
 *
 * The reference is tests/fixtures/gloss-snapshot.json: the three stacks as the tree before that change
 * computed them (origin/main, 201f65e), through tests/theme-cascade, each colour as its numbers (to 1e-9).
 * Each stack is laid on a surface of a given size by tests/gloss-model (every stop and centre in px) and
 * compared layer by layer, a stop that repeats the one before it left out (Lustre's cut, which a card moves up
 * onto 32%). So a band that moves by a fraction of a pixel on a 6.5rem card fails here, by style, scope, size
 * and layer.
 *
 * Regenerate only for a deliberate change to what a card draws, from the tree it should describe:
 *   UPDATE_GLOSS_SNAPSHOT=1 THEME_ROOT=<a checkout's root> bun run test:dom tests/gloss-snapshot.test.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Colour, canonicalColours, coverage, type Layer, painted, resolveLayer, rowsLit, splitArgs } from "./gloss-model";
import { computedVars, html, type ModelElement } from "./theme-cascade";

const SNAPSHOT = "tests/fixtures/gloss-snapshot.json";

/** Each style's stack, and its layers by name, in order. */
const STYLES = {
  crystal: {
    stack: "--crystal-stack-bg",
    layers: [
      "top",
      "side",
      "glow",
      "streak",
      "fresco",
      "wash",
    ],
  },
  chakra: {
    stack: "--glass-chakra-stack-bg",
    layers: [
      "top",
      "side",
      "glow",
      "streak",
      "fresco",
      "wash",
    ],
  },
  lustre: {
    stack: "--glass-lustre-stack-bg",
    layers: [
      "top",
      "glow",
      "streak",
      "fresco",
      "wash",
      "body",
    ],
  },
} as const;
type Style = keyof typeof STYLES;
const STYLE_NAMES = Object.keys(STYLES) as Style[];

const FLAVORS = [
  "white",
  "tonal",
  "hue",
];
const SHAPES = [
  "bevel",
  "frame",
];
const MODES = [
  "day",
  "night",
];
const scopeName = (mode: string, flavor: string, shape: string) => `${mode} ${flavor} ${shape}`;
const scope = (mode: string, flavor: string, shape: string): ModelElement[] => {
  const [root] = html(mode === "night", "amethyst");
  return [
    {
      ...root,
      attrs: {
        ...root.attrs,
        "data-gloss": flavor,
        "data-gloss-shape": shape,
      },
    },
  ];
};

const rem = (n: number) => n * 16;
type Size = [
  string,
  number,
  number,
];
/** Cards and panels, w × h in px: the four a check of the first small-control edit found changed (6.5rem and 7rem
 *  tall, 15rem and 16.9rem wide), then every card from the smallest (16rem × 6rem) out to a page-wide panel. */
const CARDS: Size[] = [
  [
    "a card 6.5rem tall",
    rem(20),
    rem(6.5),
  ],
  [
    "a card 7rem tall",
    rem(24),
    rem(7),
  ],
  [
    "a panel 15rem wide",
    rem(15),
    rem(30),
  ],
  [
    "a panel 16.9rem wide",
    rem(16.9),
    rem(40),
  ],
];
for (const w of [
  16,
  16.9,
  18,
  20,
  24,
  30,
  40,
  56,
  80,
])
  for (const h of [
    6,
    6.5,
    7,
    8,
    10,
    14,
    20,
    30,
    40,
  ])
    CARDS.push([
      `${w}rem × ${h}rem`,
      rem(w),
      rem(h),
    ]);
for (const h of [
  7,
  10,
  20,
  40,
])
  CARDS.push([
    `a 15rem panel ${h}rem tall`,
    rem(15),
    rem(h),
  ]);
/** Small controls, w × h in px: short ones, and long ones whose diagonal is a card's. */
const CONTROLS: Size[] = [
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
    "a menu item",
    200,
    32,
  ],
  [
    "a select",
    218,
    40,
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
  [
    "a search field",
    870,
    40,
  ],
  [
    "a message",
    1240,
    52,
  ],
  [
    "a 4rem row",
    300,
    64,
  ],
];

type Snapshot = Record<string, Record<Style, string>>;
function computeStacks(): Snapshot {
  const out: Snapshot = {};
  for (const mode of MODES)
    for (const flavor of FLAVORS)
      for (const shape of SHAPES) {
        const vars = computedVars(scope(mode, flavor, shape));
        const stacks = {} as Record<Style, string>;
        for (const style of STYLE_NAMES) {
          const v = vars.get(STYLES[style].stack);
          if (v === undefined) throw new Error(`gloss-snapshot: ${STYLES[style].stack} does not compute (${scopeName(mode, flavor, shape)})`);
          stacks[style] = canonicalColours(v);
        }
        out[scopeName(mode, flavor, shape)] = stacks;
      }
  return out;
}

/** A stack's layers by name, each as it paints on a w × h surface (null for `none`). */
function layersOf(style: Style, stack: string, w: number, h: number): Record<string, Layer | null> {
  const raw = splitArgs(stack);
  const names = STYLES[style].layers;
  if (raw.length !== names.length) throw new Error(`gloss-snapshot: ${style}'s stack has ${raw.length} layers, not ${names.length}`);
  return Object.fromEntries(
    names.map((name, i) => {
      const layer = resolveLayer(raw[i], w, h);
      return [
        name,
        layer && painted(layer),
      ];
    }),
  );
}

/** Where two painted layers differ, as readable lines (none when they paint the same pixels). */
function differences(a: Layer | null, b: Layer | null): string[] {
  if (a === null || b === null)
    return a === b
      ? []
      : [
          `${a ? "a gradient" : "none"} ≠ ${b ? "a gradient" : "none"}`,
        ];
  const out: string[] = [];
  const near = (x: number, y: number) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
  const sameColour = (x: Colour, y: Colour) => near(x.l, y.l) && near(x.c, y.c) && near(x.h, y.h) && near(x.a, y.a);
  if (a.kind !== b.kind || a.space !== b.space) out.push(`${a.kind} in ${a.space || "oklab"} ≠ ${b.kind} in ${b.space || "oklab"}`);
  for (const k of [
    "angle",
    "x",
    "y",
    "length",
  ] as const)
    if (!near(a[k], b[k])) out.push(`${k} ${a[k]} ≠ ${b[k]}`);
  if (a.entries.length !== b.entries.length) out.push(`${a.entries.length} stops ≠ ${b.entries.length}`);
  else
    a.entries.forEach((e, i) => {
      const f = b.entries[i];
      const same = "hint" in e ? "hint" in f && near(e.hint, f.hint) : "colour" in f && near(e.at, f.at) && sameColour(e.colour, f.colour);
      if (!same) out.push(`stop ${i}: ${JSON.stringify(e)} ≠ ${JSON.stringify(f)}`);
    });
  return out;
}

/** Every difference between the stacks now and in the snapshot, on these sizes, in these scopes. */
function compare(before: Snapshot, now: Snapshot, style: Style, scopes: string[], sizes: Size[]): string[] {
  const out: string[] = [];
  for (const name of scopes)
    for (const [label, w, h] of sizes) {
      const was = layersOf(style, before[name][style], w, h);
      const is = layersOf(style, now[name][style], w, h);
      for (const layer of STYLES[style].layers) for (const d of differences(is[layer], was[layer])) out.push(`${name}, ${label}, ${layer}: ${d}`);
    }
  return out;
}

if (process.env.UPDATE_GLOSS_SNAPSHOT === "1") {
  it(`writes ${SNAPSHOT} from ${process.env.THEME_ROOT ?? "this tree"}`, () => {
    writeFileSync(SNAPSHOT, `${JSON.stringify(computeStacks(), null, 2)}\n`);
  });
} else {
  const before: Snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
  const now = computeStacks();
  const scopes = (flavors: string[], shapes: string[]) => MODES.flatMap((m) => flavors.flatMap((f) => shapes.map((s) => scopeName(m, f, s))));

  describe("a card and a panel draw the gloss they drew", () => {
    for (const style of STYLE_NAMES)
      for (const shape of SHAPES) {
        it(`${style}, ${shape}: the four the first edit changed, under every flavor, by day and at night`, () => {
          expect(
            compare(
              before,
              now,
              style,
              scopes(FLAVORS, [
                shape,
              ]),
              CARDS.slice(0, 4),
            ),
          ).toEqual([]);
        });
        it(`${style}, ${shape}: every card and panel`, () => {
          expect(
            compare(
              before,
              now,
              style,
              scopes(FLAVORS, [
                shape,
              ]),
              CARDS.slice(4),
            ),
          ).toEqual([]);
        });
      }
  });

  describe("the tonal and hue flavors draw the gloss they drew at every size", () => {
    for (const style of STYLE_NAMES)
      it(`${style}: a small control draws what it drew`, () => {
        expect(
          compare(
            before,
            now,
            style,
            scopes(
              [
                "tonal",
                "hue",
              ],
              SHAPES,
            ),
            CONTROLS,
          ),
        ).toEqual([]);
      });
  });

  /* Under the white flavor, whose ink is L100 at night, a small control keeps its rim and loses what crossed its
     face: the streak where its diagonal is under 10rem (Crystal's and Chakra's; whole again from 15rem), the
     sheen where it is under 15rem (Lustre's), and the glow under 4.5rem tall. The bevel's bands, Lustre's top and
     the frame's sides are what they were; the frame's top and bottom are 0.25rem. */
  describe("under the white flavor a small control keeps its rim and nothing more", () => {
    const line135 = (w: number, h: number) => (w + h) * Math.SQRT1_2;
    const line125 = (w: number, h: number) => w * Math.sin((125 * Math.PI) / 180) - h * Math.cos((125 * Math.PI) / 180);
    const paints = (layer: Layer | null, w: number, h: number) =>
      layer
        ? coverage(
            [
              layer,
            ],
            w,
            h,
          ).max
        : 0;
    for (const style of STYLE_NAMES)
      for (const shape of SHAPES)
        it(`${style}, ${shape}`, () => {
          for (const mode of MODES) {
            const name = scopeName(mode, "white", shape);
            for (const [control, w, h] of CONTROLS) {
              const was = layersOf(style, before[name][style], w, h);
              const is = layersOf(style, now[name][style], w, h);
              const at = `${name}, ${control}`;
              // What crossed the face goes where the control is small; it drew there before.
              const line = style === "lustre" ? line125(w, h) : line135(w, h);
              const gone = style === "lustre" ? rem(14.99) : rem(10);
              if (line < gone) {
                expect(paints(was.streak, w, h), `${at}: the streak drew before`).toBeGreaterThan(0.1);
                expect(paints(is.streak, w, h), `${at}: the streak`).toBe(0);
              } else if (line >= rem(15)) expect(differences(is.streak, was.streak), `${at}: a long control keeps its streak`).toEqual([]);
              else
                expect(
                  coverage(
                    [
                      is.streak as Layer,
                    ],
                    w,
                    h,
                  ).mean,
                  `${at}: the streak fades`,
                ).toBeLessThan(
                  coverage(
                    [
                      was.streak as Layer,
                    ],
                    w,
                    h,
                  ).mean,
                );
              if (h < rem(4.5)) {
                expect(paints(was.glow, w, h), `${at}: the glow drew before`).toBeGreaterThan(0.1);
                expect(paints(is.glow, w, h), `${at}: the glow`).toBe(0);
              }
              // The rim stays: the bevel's bands, Lustre's top (it keeps its polish in either shape), the frame's sides.
              if (style === "lustre" || shape === "bevel") expect(differences(is.top, was.top), `${at}: the top band`).toEqual([]);
              if (style !== "lustre") expect(differences(is.side, was.side), `${at}: the side band`).toEqual([]);
              // The frame's top and bottom: four rows each (0.25rem), where they were 0.5rem, or 30% of a tiny one.
              if (style !== "lustre" && shape === "frame") {
                expect(rowsLit(is.top as Layer, w, h), `${at}: the frame's top and bottom rows`).toBe(8);
                expect(rowsLit(was.top as Layer, w, h), `${at}: they were deeper`).toBeGreaterThan(8);
              }
              // Lustre's short controls keep only the top band: the middle third, where the words are, is clear.
              if (style === "lustre" && line < gone && h < rem(4.5)) {
                const face = [
                  is.top,
                  is.glow,
                  is.streak,
                ].filter((l): l is Layer => l !== null);
                expect(coverage(face, w, h).middle, `${at}: the middle third`).toBe(0);
              }
            }
          }
        });
  });
}
