/**
 * `data-mode="night"` draws the page's theme at night on any element, whatever the page's mode: on a day page what a
 * plain element computes at night, and on a night page what the page itself is, its theme, its style and every knob
 * the engine composes from re-composed on the element. A consumer uses it for something that is the theme's night
 * glass in either mode (HERO's selected options: the night glass by day, and at night the night glass lifted by a
 * film of its own colour). Where `data-mode="inverse"` draws the OTHER mode, this draws night.
 *
 * Measured through tests/theme-cascade, token for token, as tests/mode-inverse.test.ts measures the inverse: every
 * custom property a plain element computes at night, the night scope computes to the same value, and nothing else.
 * Also: the page's theme wins over a tint scope between the page and it (it restates the page's inputs on itself, in
 * either page mode), a tint scope inside it draws as at night, an explicit material it stands in re-composes at
 * night, and a status Alert inside it keeps the night surface. Onyx needs nothing of its own: dark in either mode,
 * a night scope on an Onyx page is Onyx at night.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computedVars, html, type ModelElement, nonInherited, presetNames } from "./theme-cascade";

const NIGHT: ModelElement = {
  attrs: {
    "data-mode": "night",
  },
};
const PLAIN: ModelElement = {};
const STATUS = new Set([
  "info",
  "success",
  "warning",
  "destructive",
]);
/** Every theme a page can wear: the default (no preset) and every named preset but the status tints, Onyx included. */
const PAGES: (string | undefined)[] = [
  undefined,
  ...presetNames().filter((name) => !STATUS.has(name)),
];

/** The tokens where two computed maps differ, as "name: a ≠ b" lines, leaving out what is registered `inherits: false`
 *  (:root declares it for itself, so a plain child never has it). */
function differences(actual: Map<string, string>, expected: Map<string, string>): string[] {
  const own = nonInherited();
  const out: string[] = [];
  for (const [name, value] of expected) if (!own.has(name) && actual.get(name) !== value) out.push(`${name}: ${actual.get(name)} ≠ ${value}`);
  for (const name of actual.keys()) if (!own.has(name) && !expected.has(name)) out.push(`${name}: computed only on the night scope`);
  return out;
}

describe("a night scope draws the page's theme at night", () => {
  for (const tint of PAGES)
    for (const dark of [
      false,
      true,
    ])
      it(`on a ${dark ? "night" : "day"} ${tint ?? "default"} page`, () => {
        const night = computedVars([
          ...html(dark, tint),
          NIGHT,
        ]);
        const plain = computedVars([
          ...html(true, tint),
          PLAIN,
        ]);
        expect(differences(night, plain)).toEqual([]);
      });
});

describe("the page's theme, wherever the night scope stands", () => {
  it("restates the page's theme over a tint scope between them, in either page mode", () => {
    for (const dark of [
      false,
      true,
    ]) {
      const night = computedVars([
        ...html(dark, "sapphire"),
        {
          attrs: {
            "data-glass-tint": "rose",
          },
        },
        NIGHT,
      ]);
      const plain = computedVars([
        ...html(true, "sapphire"),
        PLAIN,
      ]);
      expect(differences(night, plain), dark ? "night page" : "day page").toEqual([]);
    }
  });

  it("draws a tint scope inside it as the night draws that scope", () => {
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
        NIGHT,
        scope,
      ]);
      const plain = computedVars([
        ...html(true, "sapphire"),
        scope,
      ]);
      expect(differences(inside, plain), dark ? "night page" : "day page").toEqual([]);
    }
  });

  it("re-composes an explicit material it stands in, at night", () => {
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
      const surface = (vars: Map<string, string>) =>
        new Map(
          [
            ...vars,
          ].filter(([name]) => /^--(srf|glass)-/.test(name)),
        );
      for (const dark of [
        false,
        true,
      ]) {
        const inside = computedVars([
          ...html(dark, "sapphire"),
          card,
          NIGHT,
        ]);
        const plain = computedVars([
          ...html(true, "sapphire"),
          card,
        ]);
        expect(differences(surface(inside), surface(plain)), `${material}, ${dark ? "night page" : "day page"}`).toEqual([]);
      }
    }
  });

  it("draws night inside an inverse that draws the day", () => {
    const night = computedVars([
      ...html(true, "sapphire"),
      {
        attrs: {
          "data-mode": "inverse",
        },
      },
      NIGHT,
    ]);
    const plain = computedVars([
      ...html(true, "sapphire"),
      PLAIN,
    ]);
    expect(differences(night, plain)).toEqual([]);
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

describe("a status Alert inside a night scope", () => {
  it("keeps its night surface on a day page", () => {
    const ALERT: ModelElement = {
      attrs: {
        "data-slot": "alert",
        "data-glass-tint": "info",
      },
    };
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
    expect(
      surface([
        ...html(false, "sapphire"),
        NIGHT,
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

describe("the surfaces and the dark: variant name the night scope", () => {
  it("re-composes every page style's surface on a night scope", () => {
    const styles = readFileSync("app/theme/styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const style of [
      "frosted",
      "crystal",
      "lustre",
      "chakra",
      "lucite",
    ]) {
      const remap = new RegExp(`:where\\(\\s*\\[data-glass="${style}"\\][^{]*\\{`).exec(styles)?.[0] ?? "";
      expect(remap.replace(/\s+/g, " "), style).toContain(`[data-glass="${style}"] [data-mode="night"]`);
    }
  });

  it("turns dark: on inside a night scope, on a day page and a night page", () => {
    const variant = readFileSync("app/theme/registrations.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const block = /@custom-variant dark \{([\s\S]*?)\n\}/.exec(variant)?.[1] ?? "";
    const branches = [
      ...block.matchAll(/&(:where\([^{]*?)\s*\{\s*@slot;\s*\}/g),
    ].map((m) => m[1].trim());
    const matches = (pageDark: boolean) => {
      document.documentElement.className = pageDark ? "dark" : "";
      document.body.innerHTML = '<div data-mode="night"><p id="subject"></p></div>';
      const subject = document.getElementById("subject") as HTMLElement;
      return branches.some((branch) => subject.matches(`*${branch}`));
    };
    expect(matches(false), "a night scope on a day page").toBe(true);
    expect(matches(true), "a night scope on a night page").toBe(true);
    document.documentElement.className = "";
    document.body.innerHTML = "";
  });
});
