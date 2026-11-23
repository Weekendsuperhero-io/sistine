/**
 * `data-mode="inverse"` draws the page's glass in the OTHER mode: on a day page, an inverse element computes what a
 * plain element computes at night, and on a night page what it computes by day — the page's own theme, its tint
 * and every knob the engine composes from, re-composed on the element. A consumer uses it for something that must
 * stand out from the page in the page's own material (HERO's selected options: the theme's night glass by day,
 * its day glass at night).
 *
 * Measured through tests/theme-cascade (the cascade, var() and the engine's math), token for token: every custom
 * property the other mode computes, the inverse computes to the same value, and it computes nothing the other mode
 * does not. Also: the page's theme wins over a tint scope between the page and the inverse (the inverse restates the
 * page's inputs on itself), and a tint scope inside an inverse draws as it would in the other mode.
 *
 * The day an inverse draws on a night page carries one thing the day does not: its marks drawn to show (block D of
 * engine.css), so there the other mode is the day with exactly block D's declarations, read from the source. Onyx is
 * dark in either mode, so on an Onyx page the inverse is Selenite by day, with them too.
 *
 * The page styles' surface remaps (styles.css, one `:where()` list each) are outside the model, which reads a
 * top-level `:where()` list as one selector; a structural check below holds each to name the inverse.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inSrgbGamut } from "@/lib/oklch-utils";
import { computedVars, evalOklch, html, type ModelElement, nonInherited, presetNames } from "./theme-cascade";

const INVERSE: ModelElement = {
  attrs: {
    "data-mode": "inverse",
  },
};
const PLAIN: ModelElement = {};
const STATUS = new Set([
  "info",
  "success",
  "warning",
  "destructive",
]);
/** Every theme a page can wear: the default (no preset) and every named preset but the status tints, and but Onyx,
 *  whose inverse is Selenite's day (measured on its own below). */
const PAGES: (string | undefined)[] = [
  undefined,
  ...presetNames().filter((name) => !STATUS.has(name) && name !== "onyx"),
];

/** Block D of engine.css, as declared: what the day an inverse draws on a dark page adds (its marks drawn to show). */
const MARKS: Record<string, string> = (() => {
  const engine = readFileSync("app/theme/engine.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const body = /\.dark \[data-mode="inverse"\],\s*:root\[data-glass-tint="onyx"\] \[data-mode="inverse"\],[^{]*\{([^}]*)\}/.exec(engine)?.[1];
  if (!body) throw new Error("mode-inverse: engine.css's block D is not where this test reads it");
  return Object.fromEntries(
    [
      ...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g),
    ].map((m) => [
      m[1],
      m[2].trim(),
    ]),
  );
})();

/** <html> of a day page wearing `tint`, with block D's declarations on it: the day a dark page's inverse draws, every
 *  token composed from them where <html>'s are (the inverse restates the root's rules on itself). */
function dayWithMarks(tint?: string): ModelElement[] {
  const [root] = html(false, tint);
  return [
    {
      ...root,
      style: MARKS,
    },
  ];
}

/** The tokens where two computed maps differ, as "name: a ≠ b" lines. A property registered `inherits: false` is
 *  left out: :root declares it for itself, so a plain child never has it and the inverse (declared on) always does. */
function differences(actual: Map<string, string>, expected: Map<string, string>): string[] {
  const own = nonInherited();
  const out: string[] = [];
  for (const [name, value] of expected) if (!own.has(name) && actual.get(name) !== value) out.push(`${name}: ${actual.get(name)} ≠ ${value}`);
  for (const name of actual.keys()) if (!own.has(name) && !expected.has(name)) out.push(`${name}: computed only on the inverse`);
  return out;
}

describe("an inverse element draws the page's glass in the other mode", () => {
  for (const tint of PAGES)
    for (const dark of [
      false,
      true,
    ])
      it(`on a ${dark ? "night" : "day"} ${tint ?? "default"} page`, () => {
        const inverse = computedVars([
          ...html(dark, tint),
          INVERSE,
        ]);
        // On a night page it draws the day, with its marks drawn to show (block D).
        const other = computedVars([
          ...(dark ? dayWithMarks(tint) : html(true, tint)),
          PLAIN,
        ]);
        expect(differences(inverse, other)).toEqual([]);
      });
});

describe("on an Onyx page, dark in either mode", () => {
  for (const dark of [
    false,
    true,
  ])
    it(`an inverse draws Selenite by day, with its marks (a ${dark ? "night" : "day"} page)`, () => {
      const inverse = computedVars([
        ...html(dark, "onyx"),
        INVERSE,
      ]);
      const selenite = computedVars([
        ...dayWithMarks("selenite"),
        PLAIN,
      ]);
      expect(differences(inverse, selenite)).toEqual([]);
    });

  it("and in a light colour scheme, where the page's is dark", () => {
    const presets = readFileSync("app/theme/presets.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(presets).toMatch(/:root\[data-glass-tint="onyx"\] \[data-mode="inverse"\] \{\s*color-scheme: light;\s*\}/);
  });
});

describe("the marks a dark page's inverse draws", () => {
  it("stay inside sRGB on every theme", () => {
    const outside: string[] = [];
    for (const tint of [
      ...PAGES,
      "onyx",
    ])
      for (const name of [
        "--shadow-highlight",
        "--glass-gloss-ink-tonal",
        "--glass-lustre-ink-tonal",
      ]) {
        const value = computedVars([
          ...html(true, tint),
          INVERSE,
        ]).get(name);
        if (value === undefined) throw new Error(`${name} does not compute on the inverse of ${tint ?? "the default"}`);
        const ink = evalOklch(value);
        if (!inSrgbGamut(ink.l, ink.c, ink.h)) outside.push(`${tint ?? "default"} ${name}: oklch(${ink.l} ${ink.c} ${ink.h})`);
      }
    expect(outside).toEqual([]);
  });
});

describe("the page's theme, wherever the inverse stands", () => {
  it("restates the page's theme over a tint scope between them", () => {
    for (const dark of [
      false,
      true,
    ]) {
      const inverse = computedVars([
        ...html(dark, "sapphire"),
        {
          attrs: {
            "data-glass-tint": "rose",
          },
        },
        INVERSE,
      ]);
      const other = computedVars([
        ...(dark ? dayWithMarks("sapphire") : html(true, "sapphire")),
        PLAIN,
      ]);
      expect(differences(inverse, other), dark ? "night page" : "day page").toEqual([]);
    }
  });

  it("draws a tint scope inside it as the other mode draws that scope", () => {
    const scope: ModelElement = {
      attrs: {
        "data-glass-tint": "rose",
      },
    };
    for (const dark of [
      false,
      true,
    ]) {
      const inside = computedVars([
        ...html(dark, "sapphire"),
        INVERSE,
        scope,
      ]);
      const other = computedVars(
        dark
          ? [
              ...dayWithMarks("sapphire"),
              {
                ...scope,
                style: MARKS,
              },
            ]
          : [
              ...html(true, "sapphire"),
              scope,
            ],
      );
      expect(differences(inside, other), dark ? "night page" : "day page").toEqual([]);
    }
  });

  it("re-composes an explicit material it stands in, in the other mode", () => {
    for (const material of [
      "glass",
      "frosted",
      "crystal",
      "lustre",
      "chakra",
      "lucite",
    ]) {
      const card: ModelElement = {
        attrs: {
          "data-material": material,
        },
      };
      for (const dark of [
        false,
        true,
      ]) {
        const inside = computedVars([
          ...html(dark, "sapphire"),
          card,
          INVERSE,
        ]);
        // What the material computes in the other mode: the card itself. Its SURFACE (the --srf-* pins and the --glass-*
        // stacks they read) is what the inverse re-composes. The role inks are left out: the inverse restates :root /
        // .dark on itself, so `--card-foreground: var(--foreground)` re-composes from the material's text tier there,
        // as it does on any mode wrapper, where a plain element inherits <html>'s.
        const surface = (vars: Map<string, string>) =>
          new Map(
            [
              ...vars,
            ].filter(([name]) => /^--(srf|glass)-/.test(name)),
          );
        const other = computedVars([
          ...(dark ? dayWithMarks("sapphire") : html(true, "sapphire")),
          card,
        ]);
        expect(differences(surface(inside), surface(other)), `${material}, ${dark ? "night page" : "day page"}`).toEqual([]);
      }
    }
  });

  it("leaves everything outside it as it was", () => {
    for (const dark of [
      false,
      true,
    ])
      expect(
        differences(
          computedVars([
            ...html(dark, "sapphire"),
            PLAIN,
          ]),
          computedVars([
            ...html(dark, "sapphire"),
            {
              classes: [
                "unrelated",
              ],
            },
          ]),
        ),
      ).toEqual([]);
  });
});

describe("a status Alert inside an inverse", () => {
  const ALERT: ModelElement = {
    attrs: {
      "data-slot": "alert",
      "data-glass-tint": "info",
    },
  };
  /** The Alert's own day surface (presets.css, THE STATUS ALERT BY DAY): slots registered `inherits: false`. */
  const surface = (chain: ModelElement[]) => {
    const vars = computedVars(chain);
    return [
      "--srf-solidify-l",
      "--srf-tint-a",
      "--srf-solidify-bg",
      "--srf-backing",
      "--srf-film",
    ].map((name) => `${name}: ${vars.get(name)}`);
  };

  it("wears its day surface inside one that draws the day", () => {
    expect(
      surface([
        ...html(true, "sapphire"),
        INVERSE,
        ALERT,
      ]),
      "a night page",
    ).toEqual(
      surface([
        ...html(false, "sapphire"),
        ALERT,
      ]),
    );
    expect(
      surface([
        ...html(true, "onyx"),
        INVERSE,
        ALERT,
      ]),
      "an Onyx page",
    ).toEqual(
      surface([
        ...html(false, "selenite"),
        ALERT,
      ]),
    );
  });

  it("and not inside one that draws night", () => {
    expect(
      surface([
        ...html(false, "sapphire"),
        INVERSE,
        ALERT,
      ]),
    ).toEqual(
      surface([
        ...html(true, "sapphire"),
        ALERT,
      ]),
    );
  });
});

describe("the surfaces and the dark: variant name the inverse", () => {
  it("re-composes every page style's surface on an inverse element", () => {
    const styles = readFileSync("app/theme/styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const style of [
      "frosted",
      "crystal",
      "lustre",
      "chakra",
      "lucite",
    ]) {
      const remap = new RegExp(`:where\\(\\s*\\[data-glass="${style}"\\][^{]*\\{`).exec(styles)?.[0] ?? "";
      expect(remap.replace(/\s+/g, " "), style).toContain(`[data-glass="${style}"] [data-mode="inverse"]`);
    }
  });

  it("turns dark: on inside an inverse on a day page, and off inside one on a night page", () => {
    const variant = readFileSync("app/theme/registrations.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const block = /@custom-variant dark \{([\s\S]*?)\n\}/.exec(variant)?.[1] ?? "";
    const branches = [
      ...block.matchAll(/&(:where\([^{]*?)\s*\{\s*@slot;\s*\}/g),
    ].map((m) => m[1].trim());
    expect(branches).toHaveLength(2);
    // Each branch, as the subject's own selector, against a small page (document.querySelector in jsdom).
    const matches = (pageDark: boolean, inInverse: boolean) => {
      document.documentElement.className = pageDark ? "dark" : "";
      document.body.innerHTML = inInverse ? '<div data-mode="inverse"><p id="subject"></p></div>' : '<div><p id="subject"></p></div>';
      const subject = document.getElementById("subject") as HTMLElement;
      return branches.some((branch) => subject.matches(`*${branch}`));
    };
    expect(matches(false, false), "a day page").toBe(false);
    expect(matches(true, false), "a night page").toBe(true);
    expect(matches(false, true), "an inverse on a day page").toBe(true);
    expect(matches(true, true), "an inverse on a night page").toBe(false);
    // On an Onyx page without .dark the inverse is Selenite by day: dark: stays off in it.
    document.documentElement.dataset.glassTint = "onyx";
    expect(matches(false, true), "an inverse on a light Onyx page").toBe(false);
    delete document.documentElement.dataset.glassTint;
    document.documentElement.className = "";
    document.body.innerHTML = "";
  });
});
