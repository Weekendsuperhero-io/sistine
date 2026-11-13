/**
 * Readability rulings, pinned where they are drawn (scripts/check-contrast.mjs measures what they reach):
 *
 *   - STATUS INK: an Alert's words are its status's ink token (--<status>-ink: a visibly hued L40–45 by day,
 *     pale at night), which reads on the Alert's surface; the border and the icon keep the status colour.
 *   - ALERT DAY SURFACE: by day the status Alert alone paints a solid, paler backing and shows the wash lighter
 *     (presets.css), so a dark scene does not show through its words, through its own non-inheriting slots:
 *     the shared status tint, and every surface nested in the Alert, compute exactly what they would without
 *     it; only the four status tints; and not at night or inside onyx, whose status Alerts read the pale ink.
 *   - INPUT RIM: the glass field draws the ink border at night only (`dark:glass-border-ink`); by day it keeps
 *     the white glass rim, and an explicit borderColor axis wins.
 *   - FOCUS RING: every `ring-ring/50` (the soft day ring) carries its full-alpha night twin beside it, and a
 *     component that recolours its ring (the error field, the destructive button) recolours the night one too.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { apcaContrast, inSrgbGamut } from "@/lib/oklch-utils";
import { evaluate } from "../scripts/lib/css-math.mjs";
import { ringTwins } from "../scripts/lib/ring-twins.mjs";
import { colorOf, computedVars, html, type ModelElement, nonInherited, numberOf } from "./theme-cascade";

const STATUSES = [
  "info",
  "success",
  "warning",
  "destructive",
] as const;

describe("status ink", () => {
  it.each(STATUSES)("%s: the Alert's words are the status ink, its border and icon the status colour", (status) => {
    const { container } = render(
      createElement(
        Alert,
        {
          variant: status,
        },
        "Words",
      ),
    );
    const alert = container.querySelector('[data-slot="alert"]') as HTMLElement;
    expect(alert).toHaveClass(`text-${status}-ink`);
    expect(alert.dataset.glassTint).toBe(status);
    expect(
      [
        ...alert.classList,
      ].some((c) => c.startsWith("border-") && c.endsWith("/60")),
    ).toBe(true);
    expect(
      [
        ...alert.classList,
      ].some((c) => c.startsWith("[&>svg]:text-") && !c.endsWith("-ink")),
    ).toBe(true);
  });

  it.each(STATUSES)("%s: visibly hued by day, pale at night, in the status hue and inside sRGB", (status) => {
    const day = colorOf(`--${status}-ink`, html(false, status));
    const night = colorOf(`--${status}-ink`, html(true, status));
    /* The owner's ruling (2026-11-13): the day words stay visibly in their status hue, not a tinted near-black. */
    expect(day.l, "a status-hued ink by day, not a near-black").toBeGreaterThanOrEqual(40);
    expect(day.l).toBeLessThanOrEqual(45);
    expect(day.c, "the status hue is visible").toBeGreaterThanOrEqual(status === "destructive" ? 0.12 : 0.08);
    expect(night.l, "a pale ink at night").toBeGreaterThanOrEqual(88);
    for (const ink of [
      day,
      night,
    ]) {
      expect(inSrgbGamut(ink.l, ink.c, ink.h), `oklch(${ink.l} ${ink.c} ${ink.h})`).toBe(true);
      expect(ink.c).toBeGreaterThan(0);
    }
    /* The status hue, as its tint scope declares it (the ink is not a grey stand-in). */
    const hue = numberOf("--glass-tint-h", html(false, status));
    expect(Math.abs(((day.h - hue + 540) % 360) - 180)).toBeLessThanOrEqual(10);
  });

  it("reads far stronger than the status colour it replaces, on a pale and a deep surface", () => {
    const pale = {
      l: 94,
      c: 0.015,
      h: 25,
    };
    const deep = {
      l: 31,
      c: 0.05,
      h: 25,
    };
    const day = colorOf("--destructive-ink", html(false));
    const night = colorOf("--destructive-ink", html(true));
    /* By day, on the Alert's own pale surface (about L94, presets.css), the status colour itself misses the body
       floor and the hued ink clears it with room. */
    expect(Math.abs(apcaContrast(colorOf("--destructive", html(false)), pale))).toBeLessThan(75);
    expect(Math.abs(apcaContrast(day, pale))).toBeGreaterThan(77);
    expect(Math.abs(apcaContrast(night, deep))).toBeGreaterThan(Math.abs(apcaContrast(colorOf("--destructive", html(true)), deep)) + 25);
  });
});

describe("the status Alert's day surface", () => {
  const page = (dark: boolean, attrs: Record<string, string> = {}): ModelElement => ({
    classes: dark
      ? [
          "dark",
        ]
      : [],
    attrs,
  });
  const alertEl = (tint: string): ModelElement => ({
    attrs: {
      "data-slot": "alert",
      "data-glass-tint": tint,
    },
  });
  const tintEl = (tint: string): ModelElement => ({
    attrs: {
      "data-glass-tint": tint,
    },
  });
  /* The Alert's OWN slots (presets.css), registered non-inheriting (registrations.css). */
  const OWN = [
    "--srf-backing",
    "--srf-film",
    "--srf-solidify-bg",
    "--srf-solidify-l",
    "--srf-tint-a",
  ];
  const without = (vars: Map<string, string>, names: string[]) =>
    Object.fromEntries(
      [
        ...vars,
      ]
        .filter(([k]) => !names.includes(k))
        .sort(),
    );
  const all = (chain: ModelElement[]) =>
    Object.fromEntries(
      [
        ...computedVars(chain),
      ].sort(),
    );

  it("registers every own slot non-inheriting", () => {
    for (const name of OWN) expect(nonInherited().has(name), name).toBe(true);
  });

  it.each(STATUSES)("%s: by day the Alert paints a solid, paler backing and shows the wash lighter, on its own slots", (status) => {
    const alert = computedVars([
      page(false),
      alertEl(status),
    ]);
    const tint = computedVars([
      page(false),
      tintEl(status),
    ]);
    /* Everything the tint scope computes, the Alert computes the same: it changes no shared token. */
    expect(without(alert, OWN)).toEqual(
      all([
        page(false),
        tintEl(status),
      ]),
    );
    const solidifyL = Number(alert.get("--srf-solidify-l"));
    expect(solidifyL).toBeGreaterThan(
      numberOf("--glass-solidify-l", [
        page(false),
        tintEl(status),
      ]),
    );
    /* Its backing is the backing the shared formula paints at that lightness (tokens.css's day cap, tapered). */
    const own = colorOf("--srf-solidify-bg", [
      page(false),
      alertEl(status),
    ]);
    const shared = colorOf("--glass-solidify-bg", [
      page(false),
      {
        ...tintEl(status),
        style: {
          "--glass-solidify-l": String(solidifyL),
        },
      },
    ]);
    expect(own.l).toBeCloseTo(shared.l, 6);
    expect(own.c).toBeCloseTo(shared.c, 6);
    expect(own.h).toBeCloseTo(shared.h, 6);
    expect(own.a).toBe(1);
    expect(inSrgbGamut(own.l, own.c, own.h)).toBe(true);
    /* The film: the backing at t over the stack, so over the solid backing the shared wash shows at
       (1 − t) × --glass-tint-a, which is --srf-tint-a. */
    const film = alert.get("--srf-film") ?? "";
    const pct = /\s(calc\(max\(0, [^%]*%\)), transparent\)/.exec(film)?.[1];
    expect(pct, "the film's alpha").toBeDefined();
    const t = evaluate(pct as string).v / 100;
    const washA = Number(tint.get("--glass-tint-a"));
    const shownA = Number(alert.get("--srf-tint-a"));
    expect(shownA).toBeLessThan(washA);
    expect((1 - t) * washA).toBeCloseTo(shownA, 9);
    expect(alert.get("--srf-backing")).toMatch(/^linear-gradient\(oklch/);
  });

  /* What nests in a day status Alert computes exactly what it would in the plain status tint: a tinted child
     (the destructive Button), an untinted glass surface (a glass Input or Card), and an unmarked `.glass` on
     the opaque page, whose dropped backing the Alert must not revive. */
  const CHILDREN: Array<
    [
      string,
      ModelElement,
    ]
  > = [
    [
      "a destructive Button",
      {
        classes: [
          "glass",
        ],
        attrs: {
          "data-slot": "button",
          "data-glass-tint": "destructive",
        },
      },
    ],
    [
      "a glass Input",
      {
        classes: [
          "glass",
          "glass-border",
        ],
        attrs: {
          "data-slot": "input",
        },
      },
    ],
    [
      "a Card",
      {
        classes: [
          "glass",
        ],
        attrs: {
          "data-slot": "card",
        },
      },
    ],
  ];
  const PAGES: Array<
    [
      string,
      Record<string, string>,
    ]
  > = [
    [
      "the default page",
      {},
    ],
    [
      "the opaque page",
      {
        "data-glass": "opaque",
      },
    ],
    [
      "a lapis page",
      {
        "data-glass-tint": "lapis",
      },
    ],
  ];
  it.each(
    STATUSES.flatMap((s) =>
      CHILDREN.flatMap(([what, el]) =>
        PAGES.map(
          ([where, attrs]) =>
            [
              s,
              what,
              where,
              el,
              attrs,
            ] as const,
        ),
      ),
    ),
  )("%s: %s inside the day Alert on %s keeps exactly what it computes in the plain tint", (status, _what, _where, el, attrs) => {
    const inAlert = all([
      page(false, attrs),
      alertEl(status),
      el,
    ]);
    expect(inAlert).toEqual(
      all([
        page(false, attrs),
        tintEl(status),
        el,
      ]),
    );
    for (const name of OWN) expect(inAlert[name], name).toBeUndefined();
  });

  it("the destructive Button inside a day destructive Alert computes what it does outside one", () => {
    const button = CHILDREN[0][1];
    expect(
      all([
        page(false),
        alertEl("destructive"),
        button,
      ]),
    ).toEqual(
      all([
        page(false),
        button,
      ]),
    );
  });

  it.each([
    "lapis",
    "amethyst",
    "selenite",
  ])("a non-status tint on an Alert (data-glass-tint=%s) keeps the plain tint", (tint) => {
    expect(
      all([
        page(false),
        alertEl(tint),
      ]),
    ).toEqual(
      all([
        page(false),
        tintEl(tint),
      ]),
    );
  });

  it.each(STATUSES)("%s: at night the Alert keeps the status tint as it is", (status) => {
    expect(
      all([
        page(true),
        alertEl(status),
      ]),
    ).toEqual(
      all([
        page(true),
        tintEl(status),
      ]),
    );
  });

  it.each(STATUSES)("%s: inside onyx (dark in either mode) the Alert keeps the tint by day and reads the pale night ink", (status) => {
    const chain = [
      page(false, {
        "data-glass-tint": "onyx",
      }),
      alertEl(status),
    ];
    expect(all(chain)).toEqual(
      all([
        page(false, {
          "data-glass-tint": "onyx",
        }),
        tintEl(status),
      ]),
    );
    const ink = colorOf(`--${status}-ink`, chain);
    const night = colorOf(`--${status}-ink`, html(true, status));
    expect(ink).toEqual(night);
    /* The surface it reads on is the dark status tint over onyx's L18 backing. */
    expect(numberOf("--glass-solidify-l", chain)).toBeLessThan(30);
  });
});

describe("input rim", () => {
  const field = (props: Record<string, unknown>) =>
    render(
      createElement(Input, {
        readOnly: true,
        defaultValue: "x",
        ...props,
      }),
    ).container.querySelector("input") as HTMLElement;

  it("draws the ink border at night only on the glass field", () => {
    const glass = field({});
    expect(glass).toHaveClass("dark:glass-border-ink");
    expect(glass).not.toHaveClass("glass-border-ink");
  });

  it("leaves the default (shadcn) field on its own --input rim", () => {
    expect(
      field({
        variant: "default",
      }),
    ).not.toHaveClass("dark:glass-border-ink");
  });

  it("lets an explicit borderColor axis win, in both modes", () => {
    const ink = field({
      borderColor: "ink",
    });
    expect(ink).toHaveClass("glass-border-ink");
    expect(ink).not.toHaveClass("dark:glass-border-ink");
    expect(
      field({
        borderColor: "glass",
      }),
    ).not.toHaveClass("dark:glass-border-ink");
  });

  it("keeps the error field's ring destructive at night", () => {
    expect(
      field({
        error: true,
      }),
    ).toHaveClass("dark:focus-visible:ring-destructive");
    expect(
      field({
        error: true,
      }),
    ).not.toHaveClass("dark:focus-visible:ring-ring");
  });
});

describe("focus ring", () => {
  const dir = join(__dirname, "../components/ui");
  const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));

  it("carries a full-alpha night twin beside every soft day ring, in the same class string", () => {
    const missing: string[] = [];
    let found = 0;
    for (const file of files) {
      const r = ringTwins(readFileSync(join(dir, file), "utf8"));
      found += r.found;
      missing.push(...r.missing.map((m) => `${file} ${m}`));
    }
    expect(found).toBeGreaterThanOrEqual(13);
    expect(missing).toEqual([]);
  });

  it("checks each day ring against its own class string, not the file", () => {
    /* One twin elsewhere in the file (another element) does not cover a day ring with none beside it. */
    const src = `const a = "focus-visible:ring-ring/50 dark:focus-visible:ring-ring";\nconst b = "focus-visible:ring-ring/50 px-2";`;
    expect(ringTwins(src)).toEqual({
      found: 2,
      missing: [
        "focus-visible:ring-ring/50 (no dark:focus-visible:ring-ring beside it)",
      ],
    });
  });

  it("keeps the destructive button's own ring at night", () => {
    const src = readFileSync(join(dir, "button.tsx"), "utf8");
    expect(src).toMatch(/focus-visible:ring-destructive\/20 dark:focus-visible:ring-destructive\/20/);
  });
});

describe("the destructive button at night", () => {
  it("draws its own ring, not the role ring (tailwind-merge drops the night role twin)", async () => {
    const { Button } = await import("@/components/ui/button");
    const { container } = render(
      createElement(
        Button,
        {
          variant: "destructive",
        },
        "Delete",
      ),
    );
    const button = container.querySelector("button") as HTMLElement;
    expect(button).toHaveClass("dark:focus-visible:ring-destructive/20");
    expect(button).not.toHaveClass("dark:focus-visible:ring-ring");
  });
});
