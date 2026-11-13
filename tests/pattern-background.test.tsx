import { act, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ANIMATED_PATTERNS, DISC_PATTERNS, floorGridPath, PATTERN_STYLES, PatternBackground, stopRules } from "@/components/pattern-background";
import { GLASS_TINT_PRESETS } from "@/lib/glass-presets";

/**
 * A scene stops for two reasons — `prefers-reduced-motion` and Speed 0 — and the
 * bug these tests pin is the two DRIFTING APART: every scene honoured reduced
 * motion while Speed 0 only set `animation-play-state: paused`, which leaves the
 * element in an animating state and keeps WebKit re-rendering its layer
 * (`.au-curtain` carried a `filter: blur()` and a two-layer `mask-composite`, six
 * of them at full-viewport size; its `.au-paint` child draws them now). See AMXSF-562.
 *
 * `stopRules` is the single source both conditions are emitted from, so these
 * assert the property that makes drift impossible rather than the CSS text.
 */
describe("stopRules", () => {
  it("emits BOTH stop conditions for the same selectors", () => {
    const css = stopRules(".au-curtain", ".au-ripples");

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("[data-pat-static] .au-curtain");
    expect(css).toContain("[data-pat-static] .au-ripples");
  });

  it("REMOVES the animation rather than pausing it, in both conditions", () => {
    const css = stopRules(".au-curtain");

    // Two rule bodies, one per condition — and neither may park the animation.
    expect(css.match(/animation:\s*none/g)).toHaveLength(2);
    expect(css).not.toContain("animation-play-state");
    expect(css).not.toContain("paused");
  });

  it("releases will-change in both conditions", () => {
    // `will-change` on a stopped animation is a promoted layer doing no work.
    // The old declaration resolved to `will-change: auto, auto` at Speed 0 —
    // invalid CSS, so it was dropped and the release never happened.
    const css = stopRules(".du-grain-tile", ".du-veil");

    expect(css.match(/will-change:\s*auto/g)).toHaveLength(2);
    expect(css).not.toContain("auto, auto");
  });

  it("scopes every selector under the static attribute, not just the first", () => {
    // A `.a, .b` list prefixed once would leave `.b` unscoped and still animating.
    const css = stopRules(".pac-runner", ".pac-man", ".pac-ghost");
    const staticRule = css.split("\n").at(-1) ?? "";

    for (const sel of [
      ".pac-runner",
      ".pac-man",
      ".pac-ghost",
    ]) {
      expect(staticRule).toContain(`[data-pat-static] ${sel}`);
    }
  });

  it("holds for a single selector", () => {
    const css = stopRules(".sw-grid-rungs");

    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .sw-grid-rungs {");
    expect(css).toContain("[data-pat-static] .sw-grid-rungs {");
  });
});

/**
 * The other half of the same bug: `stopRules` can emit a perfect
 * `[data-pat-static]` rule and it still does nothing unless the attribute actually
 * lands on the scene root. Rendered with `renderToStaticMarkup` — no DOM needed,
 * and the first render is where the attribute is decided, so nothing is lost by
 * not having effects.
 */
describe("PatternBackground data-pat-static", () => {
  it("uses the day palette for Onyx while the page is light, and the night palette in dark mode", () => {
    const root = document.documentElement;
    const previousClass = root.className;
    const previousTint = root.getAttribute("data-glass-tint");
    const host = document.createElement("div");
    try {
      root.classList.remove("dark");
      root.dataset.glassTint = "onyx";
      host.innerHTML = renderToStaticMarkup(<PatternBackground style="moonrise" speed={0} />);
      document.body.append(host);
      const scene = host.querySelector('[data-pattern="moonrise"]')!;
      const stars = () => getComputedStyle(scene).getPropertyValue("--sw-stars-o").trim();
      expect(stars()).toBe("0");
      root.classList.add("dark");
      expect(stars()).toBe("1");
    } finally {
      host.remove();
      root.className = previousClass;
      if (previousTint === null) root.removeAttribute("data-glass-tint");
      else root.setAttribute("data-glass-tint", previousTint);
    }
  });
  const markup = (style: (typeof PATTERN_STYLES)[number], speed: number) => renderToStaticMarkup(<PatternBackground style={style} speed={speed} />);

  // Match the rendered ATTRIBUTE, not the string. Each scene inlines its own
  // stylesheet, which always contains the `[data-pat-static]` SELECTOR — so a bare
  // `toContain("data-pat-static")` passes even when the attribute is absent. React
  // emits `=""` for the empty-string prop, and the selector never has an `=`.
  const ATTR = 'data-pat-static=""';

  it("marks every animated scene static at speed 0", () => {
    for (const style of ANIMATED_PATTERNS) {
      expect(markup(style, 0), `${style} at speed 0`).toContain(ATTR);
    }
  });

  it("leaves the attribute OFF while the scene is running", () => {
    for (const style of ANIMATED_PATTERNS) {
      expect(markup(style, 8), `${style} at speed 8`).not.toContain(ATTR);
    }
  });

  it("still renders the scene when static — stopped is not hidden", () => {
    // `animation: none` must stop the motion without removing the artwork.
    const stopped = markup("aurora", 0);
    expect(stopped).toContain("au-curtain");
    expect(stopped).toContain('data-pattern="aurora"');
  });
});

/**
 * How many compositing layers a scene costs. A disc is its own layer (`.sw-sun`), and WebKit gives every
 * later sibling that overlaps a composited layer a layer of its own, so the z-order holds. Loose, dune drew
 * 52 masked full-viewport layers while static, and the window server re-applied every mask and blur on any
 * frame where the page above them changed. Two structures keep it to a handful, and these pin both: all
 * that a scene draws in front of its disc sits in ONE `.scene-group` (a stacking context, painted as one
 * layer), and a box that is a layer of its own (a swaying curtain) or moves (the sun path)
 * draws its blur and masks on a child, never on itself.
 */
describe("scene compositing", () => {
  const scene = (style: (typeof PATTERN_STYLES)[number]) => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<PatternBackground style={style} speed={8} />);
    return host;
  };

  it.each([
    ...DISC_PATTERNS,
  ])("%s draws everything in front of its disc inside one .scene-group", (style) => {
    const discs = scene(style).querySelectorAll(".sw-sun, .scene-moon");
    const after: Element[] = [];
    for (let el = discs[discs.length - 1]?.nextElementSibling; el; el = el.nextElementSibling) after.push(el);
    expect(discs.length).toBeGreaterThan(0);
    expect(after.map((el) => el.className)).toEqual([
      "scene-group",
    ]);
  });

  // Three curtains in the sky, and the reflection's two sets of three: the night gradient mirror and the
  // day streaks. One sun path.
  it.each([
    [
      "au-curtain",
      "au-paint",
      9,
    ],
    [
      "au-sunpath",
      "au-sunpath-paint",
      1,
    ],
  ] as const)("draws .%s's blur, masks and clip on its .%s child, not on the layer itself", (box, paint, count) => {
    const root = scene("aurora");
    const boxes = [
      ...root.querySelectorAll(`.${box}`),
    ];
    expect(boxes).toHaveLength(count);
    for (const el of boxes) {
      expect(
        [
          ...el.children,
        ].map((child) => child.className),
      ).toEqual([
        paint,
      ]);
    }
    const css = [
      ...root.querySelectorAll("style"),
    ]
      .map((s) => s.textContent ?? "")
      .join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [
      ...css.matchAll(/([^{}]*)\{([^{}]*)\}/g),
    ].filter(([, selector]) => selector.includes(`.${box}`) && !selector.includes(`.${paint}`));
    expect(rules.length).toBeGreaterThan(0);
    for (const [, selector, body] of rules) {
      expect(body, selector.trim()).not.toMatch(/filter|mask|clip-path/);
    }
  });
});

/**
 * A picker draws every scene at once, as miniatures of the full-window wallpaper. What a miniature must not
 * carry is a promoted layer that only the wallpaper needs: the root's `glass-backdrop-layer` and an
 * unconditional `will-change` on a part that stands still (the discs, the sun path). Each was one layer per
 * swatch, a hidden disc another, and every scene re-injected its stylesheets.
 */
describe("previews", () => {
  const rootOf = (html: string) => {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host.querySelector("[data-pattern]")!;
  };

  it("leaves the page-backdrop promotion off a preview, and only a preview", () => {
    for (const style of PATTERN_STYLES) {
      const wallpaper = rootOf(renderToStaticMarkup(<PatternBackground style={style} />));
      const preview = rootOf(renderToStaticMarkup(<PatternBackground style={style} preview speed={0} />));
      expect(wallpaper.classList.contains("glass-backdrop-layer"), `${style} wallpaper`).toBe(true);
      expect(wallpaper.hasAttribute("data-pat-preview"), `${style} wallpaper`).toBe(false);
      expect(preview.classList.contains("glass-backdrop-layer"), `${style} preview`).toBe(false);
      expect(preview.getAttribute("data-pat-preview"), `${style} preview`).toBe("");
    }
  });

  it("promotes nothing unconditionally, in a preview or a wallpaper", () => {
    // `var(--pat-wc, …)` is the speed-gated hint (stopRules releases it at Speed 0); a LITERAL
    // `will-change: transform` promotes whatever the scene is doing, even when nothing moves.
    const css = renderToStaticMarkup(PATTERN_STYLES.map((style) => <PatternBackground key={style} style={style} />))
      .match(/<style[^>]*>([\s\S]*?)<\/style>/g)!
      .join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [
      ...css.matchAll(/([^{}]*)\{([^{}]*)\}/g),
    ].map(([, selector, body]) => ({
      selectors: selector.split(",").map((s) => s.trim()),
      body,
    }));
    const promoted = rules.filter((r) => /will-change:\s*transform/.test(r.body)).flatMap((r) => r.selectors);
    // The discs and the sun path were the last: the scene remounts on a placement change instead.
    expect(promoted).toEqual([]);
  });

  it("remounts the scene when its disc moves, preview or wallpaper", () => {
    // A disc has no layer of its own, so moved in place it would meet the WebKit repaint bug (.sw-sun).
    for (const preview of [
      true,
      false,
    ]) {
      const view = render(<PatternBackground style="clouds" preview={preview} speed={0} disc="left" />);
      const before = view.container.querySelector("[data-pattern]");
      view.rerender(<PatternBackground style="clouds" preview={preview} speed={0} disc="right" />);
      expect(view.container.querySelector("[data-pattern]"), `preview=${preview}`).not.toBe(before);
      view.unmount();
    }
  });

  it("injects each stylesheet once, however many scenes are mounted", () => {
    const view = render(
      <>
        {PATTERN_STYLES.map((style) => (
          <PatternBackground key={style} style={style} preview speed={0} />
        ))}
        <PatternBackground style="clouds" />
      </>,
    );
    const sheets = [
      ...document.head.querySelectorAll('style[data-precedence="sistine-pattern"]'),
    ].map((s) => s.getAttribute("data-href"));
    expect(new Set(sheets).size, sheets.join(" ")).toBe(sheets.length);
    // Shared sky, the Muse, and one sheet per scene family (moonrise rides synthwave's; the geometric
    // tiles have none).
    expect(sheets.sort()).toEqual(
      [
        "aurora",
        "chase",
        "clouds",
        "dune",
        "forest",
        "meadow",
        "muse",
        "peaks",
        "sky",
        "starfield",
        "synthwave",
      ].map((name) => `sistine-pattern-${name}`),
    );
    expect(view.container.querySelector("style")).toBeNull();
  });
});

/**
 * The horizon scenes render both discs and let the palette pick one per mode. The pick has to take the other
 * one out of the render tree: at opacity 0 a disc is still a promoted layer, invisible, in the live
 * wallpaper too. jsdom does not resolve `var()` in `display`, so the gate is resolved by hand from the root.
 */
describe("disc display gates", () => {
  const shownDiscs = (style: (typeof PATTERN_STYLES)[number], dark: boolean) => {
    const html = document.documentElement;
    const previous = html.className;
    const host = document.createElement("div");
    try {
      html.classList.toggle("dark", dark);
      host.innerHTML = renderToStaticMarkup(<PatternBackground style={style} />);
      document.body.append(host);
      const root = getComputedStyle(host.querySelector("[data-pattern]")!);
      return [
        ...host.querySelectorAll(".sw-sun, .scene-moon"),
      ]
        .filter((disc) => {
          const display = getComputedStyle(disc).display;
          const gate = /^var\((--[\w-]+),\s*([\w-]+)\)$/.exec(display);
          return (gate ? root.getPropertyValue(gate[1]).trim() || gate[2] : display) !== "none";
        })
        .map((disc) => disc.className);
    } finally {
      host.remove();
      html.className = previous;
    }
  };

  it.each([
    "clouds",
    "dune",
    "forest",
    "peaks",
    "meadow",
  ] as const)("%s keeps only the sun by day and only the moon by night", (style) => {
    expect(shownDiscs(style, false)).toEqual([
      "sw-sun",
    ]);
    expect(shownDiscs(style, true)).toEqual([
      "scene-moon",
    ]);
  });

  it("keeps only aurora's sun by day and only its moon by night", () => {
    expect(shownDiscs("aurora", false)).toEqual([
      "sw-sun",
    ]);
    expect(shownDiscs("aurora", true)).toEqual([
      "scene-moon",
    ]);
  });
});

/**
 * Peaks' ridges are GENERATED, like forest's: per ridge, an inline SVG of facets and snow caps from a
 * seeded generator. It must draw the same range on the server and the client, keep its valley on the disc,
 * and light the facet that faces it.
 */
describe("peaks", () => {
  const markup = (disc?: "left" | "center" | "right") => renderToStaticMarkup(<PatternBackground style="peaks" disc={disc} />);

  it("draws the same range on every render", () => {
    expect(markup()).toBe(markup());
  });

  it("draws four ridges, each centred on the disc, the far two snow-capped", () => {
    const html = markup();
    const ridges = [
      ...html.matchAll(/<svg class="pk-ridge pk-r(\d)"[^>]*style="([^"]*)"[\s\S]*?<\/svg>/g),
    ];
    expect(ridges.map((m) => m[1])).toEqual([
      "0",
      "1",
      "2",
      "3",
    ]);
    for (const [svg, , style] of ridges) expect(style, svg.slice(0, 40)).toContain("left:calc(var(--sw-disc-x, 50%) - 375vh)");
    const capped = ridges.map(([svg]) => svg.includes("--pk-snow"));
    expect(capped).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it("lights the facets that face the disc", () => {
    expect(markup("left")).toContain("--pk-lit-l:1;--pk-lit-r:0");
    expect(markup("right")).toContain("--pk-lit-l:0;--pk-lit-r:1");
  });
});

/**
 * Meadow's hills are GENERATED: per range, one periodic tile of hill (a sum of sines plus a saddle under the
 * disc), used as a CSS mask and repeated across a strip centred on the disc. The tile has to end at the
 * height it starts at, or every repeat steps; it has to be the same on the server and the client; and only
 * the nearest range carries grass.
 */
describe("meadow", () => {
  const markup = () => renderToStaticMarkup(<PatternBackground style="meadow" />);
  /** Each range's mask path, decoded from its --mw-m custom property. */
  const masks = (html: string) =>
    [
      ...html.matchAll(/--mw-m: url\("data:image\/svg\+xml,([^"]+)"\)/g),
    ].map((m) => decodeURIComponent(m[1]).match(/d='([^']+)'/)?.[1] ?? "");

  it("draws the same hills on every render", () => {
    expect(markup()).toBe(markup());
  });

  it("draws four ranges, each tile ending at the height it starts at", () => {
    const paths = masks(markup());
    expect(paths).toHaveLength(4);
    for (const d of paths) {
      // M0 <foot> L0 <crest start> … L150 <crest end> L150 <foot> Z, then any grass blades.
      const start = d.match(/^M0 [\d.]+L0 ([\d.]+)/)?.[1];
      const end = d.match(/L150 ([\d.]+)L150 [\d.]+Z/)?.[1];
      expect(start).toBeDefined();
      expect(end).toBe(start);
    }
  });

  it("fringes only the nearest range with grass", () => {
    // A blade is its own closed triangle after the hill's outline: count the subpaths.
    const subpaths = masks(markup()).map((d) => d.split("M").length - 1);
    expect(subpaths.slice(0, 3)).toEqual([
      1,
      1,
      1,
    ]);
    expect(subpaths[3]).toBeGreaterThan(100);
  });

  it("centres every range on the disc", () => {
    const html = markup();
    expect(html.match(/class="mw-hill mw-h\d mw-fill"/g)).toHaveLength(4);
    expect(html).toContain("left: calc(var(--sw-disc-x, 50%) - 375vh)");
  });
});

/**
 * Dune's tiers are generated skewed waves (a long windward rise, a shorter lee) with a continuous slope, so
 * no crest meets its slip face at a corner: the hand-drawn set gave each tier one curve-into-straight-drop
 * corner, and tier over tier those read as a jagged zigzag. Each crest also keeps room above the box's top
 * edge for its cast shadow, which is the same silhouette nudged up.
 */
describe("dune", () => {
  const markup = () => renderToStaticMarkup(<PatternBackground style="dune" />);
  /** Every tier's silhouette path, decoded from its .du-pos-* mask. */
  const ridges = (html: string) =>
    [
      ...html.matchAll(/\.du-pos-[a-z]+ \{[^}]*?-webkit-mask: url\("data:image\/svg\+xml,([^"]+)"\)/g),
    ].map((m) => decodeURIComponent(m[1]).match(/d='([^']+)'/)?.[1] ?? "");

  it("draws the same dunes on every render", () => {
    expect(markup()).toBe(markup());
  });

  it("draws every tier as one smooth run of curves, with no corner along the crest", () => {
    const paths = ridges(markup());
    expect(paths).toHaveLength(6);
    for (const d of paths) {
      // Straight segments only at the box's edges; the crest itself is quadratic curves end to end.
      expect(d).toMatch(/^M0 60L0 [\d.]+L[\d.]+ [\d.]+(Q[\d.]+ [\d.]+ [\d.]+ [\d.]+)+L200 [\d.]+L200 60Z$/);
    }
  });

  it("keeps every crest clear of the top edge, for its cast shadow", () => {
    for (const d of ridges(markup())) {
      const ys = [
        ...d.matchAll(/(?:^|[MLQ ])[\d.]+ ([\d.]+)/g),
      ].map((m) => Number(m[1]));
      expect(Math.min(...ys)).toBeGreaterThan(12);
    }
  });
});

/**
 * Still, synthwave's and moonrise's floor grid is DRAWN in perspective (floorGridPath) rather than tilted in
 * 3D: a 3D transform always makes its element a compositing layer, and the floor was ~20 of the scene's 26.
 * The drawing has to be the same grid: the CSS perspective projection of the same plane, lines and cell.
 */
describe("synthwave floor, drawn flat", () => {
  // A 1440 × 900 window, its 42% floor: 1440 × 378.
  const [vw, vh, w, h] = [
    1440,
    900,
    1440,
    378,
  ];
  const quads = (d: string) =>
    [
      ...d.matchAll(/M([^Z]+)Z/g),
    ].map((m) => m[1].split("L").map((pt) => pt.trim().split(" ").map(Number)));

  it("puts every rung where the CSS perspective puts it, spreading toward the viewer", () => {
    // Each rung is a band: M0 <top>H<w>V<bottom>H0Z.
    const tops = [
      ...floorGridPath("rungs", w, h, vw, vh).matchAll(/M0 (-?[\d.]+)H/g),
    ].map((m) => Number(m[1]));
    // The CSS: a plane tilted back 78deg about its top edge, 4vmin (36px) above the floor, under a 75vh
    // (675px) perspective from the floor's top centre; rungs every round(4vmin) = 36px down the plane.
    const [d, t] = [
      675,
      (78 * Math.PI) / 180,
    ];
    const project = (y: number) => ((y * Math.cos(t) - 36) * d) / (d - y * Math.sin(t));
    const expected: number[] = [];
    for (let y = 0; project(y) <= h; y += 36) if (project(y + 2) >= 0) expected.push(project(y));
    expect(tops).toHaveLength(expected.length);
    tops.forEach((top, i) => expect(top).toBeCloseTo(expected[i], 1));
    const gaps = tops.slice(1).map((top, i) => top - tops[i]);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it("converges the rails on the plane's vanishing point, cot θ × perspective above the floor", () => {
    const rails = quads(floorGridPath("rails", w, h, vw, vh));
    expect(rails.length).toBeGreaterThan(10);
    // Each rail's left edge, extended upward, passes through (w/2, -d·cot 78°).
    const vanishY = -0.75 * vh * (Math.cos((78 * Math.PI) / 180) / Math.sin((78 * Math.PI) / 180));
    for (const q of rails) {
      const [[x0, y0], , , [x1, y1]] = q;
      if (Math.abs(x1 - x0) < 1) continue;
      const atVanish = x0 + ((vanishY - y0) * (x1 - x0)) / (y1 - y0);
      expect(atVanish).toBeCloseTo(w / 2, 0);
    }
  });

  it("draws flat when still, once the floor is measured, and keeps the 3D plane while it moves", async () => {
    const originalObserver = globalThis.ResizeObserver;
    const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get: () => 1440,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get: () => 378,
    });
    try {
      globalThis.ResizeObserver = class {
        constructor(private callback: ResizeObserverCallback) {}
        observe() {
          queueMicrotask(() => this.callback([], this as unknown as ResizeObserver));
        }
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
      const still = render(<PatternBackground style="synthwave" speed={0} />);
      await act(async () => {});
      expect(still.container.querySelectorAll("svg.sw-flat")).toHaveLength(2);
      expect(still.container.querySelector(".sw-grid")).toBeNull();
      still.unmount();
      const moving = render(<PatternBackground style="synthwave" speed={8} />);
      expect(moving.container.querySelectorAll(".sw-grid")).toHaveLength(2);
      expect(moving.container.querySelector("svg.sw-flat")).toBeNull();
      moving.unmount();
    } finally {
      globalThis.ResizeObserver = originalObserver;
      if (width) Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
      if (height) Object.defineProperty(HTMLElement.prototype, "offsetHeight", height);
    }
  });
});

describe("the theme cast in the day skies", () => {
  // Every cast of the tint into a scene colour (a mix weighted by --sw-cast), across every scene's stylesheet.
  // Starfield leans its sky toward the accent or tint by the same rule but is no --sw-cast (pinned below).
  const css = renderToStaticMarkup(PATTERN_STYLES.map((style) => <PatternBackground key={style} style={style} />));
  const casts = [
    ...new Set(css.match(/color-mix\([^;]*?var\(--glass-tint-h[^;]*?;/g) ?? []),
  ].filter((mix) => mix.includes("--sw-cast"));

  it("weights every cast by how far the tint's hue agrees with the stop's", () => {
    // Ungated, a warm tint swung a blue sky round the wheel through teal (in OKLCH) or greyed it (in OKLab).
    expect(casts).toHaveLength(26);
    for (const cast of casts) {
      const m = cast.match(
        /^color-mix\(in oklch, oklch\(([\d.]+) [\d.]+ (\d+)\), oklch\(([\d.]+) [\d.]+ var\(--glass-tint-h, (\d+)\)\) calc\(var\(--sw-cast\) \* max\(0, cos\(calc\(\(var\(--glass-tint-h, (\d+)\) - (\d+)\) \* 1deg\)\)\)\)\);$/,
      );
      expect(m, cast).not.toBeNull();
      const [, l, h, lTint, ...hues] = m!;
      expect(lTint, cast).toBe(l);
      for (const other of hues) expect(other, cast).toBe(h);
    }
  });
});

describe("starfield, the chosen colour in the nebulae", () => {
  const css = renderToStaticMarkup(<PatternBackground style="starfield" />).replace(/\/\*[\s\S]*?\*\//g, "");
  const block = (selector: string) =>
    [
      ...css.matchAll(/([^{}<>]*)\{([^{}]*)\}/g),
    ].find(([, s]) => s.replace(/\s+/g, " ").trim() === selector)?.[2] ?? "";
  const decl = (selector: string, name: string) =>
    block(selector)
      .match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
      .replace(/\s+/g, " ")
      .trim();
  const DAY = '[data-pattern="starfield"]';
  const NIGHT = '.dark [data-pattern="starfield"]';
  const rad = Math.PI / 180;
  const [amber, sapphire] = [
    "amber",
    "sapphire",
  ].map((name) => GLASS_TINT_PRESETS.find((p) => p.value === name)!.h);

  it("leans the sky toward the colour only as far as the hues agree, by day and by night", () => {
    // A flat 28% turned amber's day sky teal; at night the sky WAS the colour, brown for amber.
    for (const [selector, base, max] of [
      [
        DAY,
        240,
        28,
      ],
      [
        NIGHT,
        250,
        100,
      ],
    ] as const) {
      const bg = decl(selector, "--sf-bg")!;
      const m = bg.match(
        /^color-mix\( in oklch, oklch\([\d.]+ [\d.]+ (\d+)\), oklch\([\d.]+ [\d.]+ var\(--sf-h\)\) calc\((\d+)% \* max\(0, cos\(calc\(\(var\(--sf-h\) - (\d+)\) \* 1deg\)\)\)\) \)$/,
      );
      expect(m, `${selector} --sf-bg: ${bg}`).not.toBeNull();
      const [, own, weight, gate] = m!.map(Number);
      expect([
        own,
        gate,
        weight,
      ]).toEqual([
        base,
        base,
        max,
      ]);
      const lean = (h: number) => weight * Math.max(0, Math.cos((h - base) * rad));
      expect(lean(amber), `${selector}: amber keeps the blue`).toBe(0);
      expect(lean(sapphire), `${selector}: sapphire tints it`).toBeGreaterThan(0.9 * max);
    }
    expect(decl(DAY, "--sf-h")).toBe("var(--accent-h, var(--glass-tint-h, 240))");
  });

  it("turns the second cloud toward red, from every preset's hue", () => {
    // A fixed +40° took amber and citrine to olive; toward red, a warm theme's second cloud is red-orange.
    const m = decl(DAY, "--sf-h2")!.match(/^calc\(var\(--sf-h\) \+ (\d+) \* sin\(calc\(\((\d+) - var\(--sf-h\)\) \* 1deg\)\)\)$/);
    expect(m).not.toBeNull();
    const [, k, red] = m!.map(Number);
    // The target is a red (OKLCH puts red near 25), and the turn at most the old 40°.
    expect(red).toBeGreaterThanOrEqual(10);
    expect(red).toBeLessThanOrEqual(40);
    expect(k).toBeLessThanOrEqual(40);
    const h2 = (h: number) => h + k * Math.sin((red - h) * rad);
    const gap = (h: number) => Math.abs(((((h - red) % 360) + 540) % 360) - 180);
    for (const preset of GLASS_TINT_PRESETS) {
      if (gap(preset.h) < 1 || gap(preset.h) > 179) continue; // already red, or exactly opposite
      expect(gap(h2(preset.h)), `${preset.value} (h ${preset.h})`).toBeLessThan(gap(preset.h));
    }
    for (const selector of [
      DAY,
      NIGHT,
    ]) {
      expect(decl(selector, "--sf-nebula-1"), selector).toMatch(/ var\(--sf-h\) \/ 0\.(8|75)\)$/);
      expect(decl(selector, "--sf-nebula-2"), selector).toMatch(/ var\(--sf-h2\) \/ 0\.(65|55)\)$/);
    }
  });
});

describe("synthwave and moonrise grid lines, in the chosen colour", () => {
  // The scenes' rules, keyed by their selector list; comments stripped so their prose cannot match.
  const css = renderToStaticMarkup(
    <>
      <PatternBackground style="synthwave" />
      <PatternBackground style="moonrise" />
    </>,
  ).replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = new Map(
    [
      ...css.matchAll(/([^{}<>]*)\{([^{}]*)\}/g),
    ].map(([, selector, body]) => [
      selector.replace(/\s+/g, " ").trim(),
      body,
    ]),
  );
  const decl = (selector: string, name: string) =>
    rules
      .get(selector)
      ?.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
      .trim();
  const BOTH = '[data-pattern="synthwave"], [data-pattern="moonrise"]';
  const FOLLOWING = [
    // [the rule, the scene's own hue there]
    [
      '[data-pattern="synthwave"]',
      355,
    ],
    [
      '.dark [data-pattern="synthwave"]',
      195,
    ],
    [
      '[data-pattern="moonrise"]',
      270,
    ],
  ] as const;
  // What the user chose: these keep each scene's own colours, and every other preset is followed.
  const PALE = new Set([
    "selenite",
    "onyx",
    "moonstone",
  ]);

  it("draws the lines and the horizon glow at the accent's hue, else the tint's, else the scene's", () => {
    expect(decl(BOTH, "--sw-hue")).toBe("calc(var(--sw-line-h) + (var(--glass-tint-h, 0) - var(--sw-line-h)) * var(--sw-follow))");
    for (const [rule, own] of FOLLOWING) {
      expect(decl(rule, "--sw-line-h"), rule).toBe(String(own));
      expect(decl(rule, "--sw-line"), rule).toMatch(/var\(--accent-h, var\(--sw-hue\)\)\)$/);
    }
    expect(decl('[data-pattern="synthwave"]', "--sw-glow-core")).toMatch(/var\(--accent-h, var\(--sw-hue\)\)\)$/);
    expect(decl('[data-pattern="moonrise"]', "--sw-glow-core")).toMatch(/var\(--accent-h, var\(--sw-hue\)\)\)$/);
    expect(decl('.dark [data-pattern="synthwave"]', "--sw-glow-core")).toBe("var(--sw-line)");
    // Moonrise's night keeps its violet: only the accent knob moves it.
    expect(decl('.dark [data-pattern="moonrise"]', "--sw-line")).toMatch(/var\(--accent-h, var\(--sw-line-h\)\)\)$/);
  });

  it("follows every preset but the pale ones, which keep the scene's own colours", () => {
    // The gate is a step on the tint's chroma; a preset between its edges would get a hue partway round
    // from the scene's, so every preset must sit clear of it on the side the PALE set says.
    const [, edge, gain] = decl(BOTH, "--sw-follow")!
      .match(/^clamp\(0, \(var\(--glass-tint-c, 0\) - ([\d.]+)\) \* (\d+), 1\)$/)!
      .map(Number);
    const follow = (c: number) => Math.min(1, Math.max(0, (c - edge) * gain));
    const hue = (own: number, h: number, c: number) => own + (h - own) * follow(c);
    for (const [rule, own] of FOLLOWING) {
      expect(hue(own, 250, 0.018), `the default tint (engine.css: h 250, c 0.018) in ${rule}`).toBe(own);
      for (const preset of GLASS_TINT_PRESETS) {
        expect(hue(own, preset.h, preset.c), `${preset.value} (c ${preset.c}) in ${rule}`).toBeCloseTo(PALE.has(preset.value) ? own : preset.h, 9);
      }
    }
  });
});

describe("ANIMATED_PATTERNS", () => {
  it("only names real pattern styles", () => {
    // The set gates the speed control; a stale name there means a scene whose
    // Speed 0 silently does nothing.
    for (const style of ANIMATED_PATTERNS) {
      expect(PATTERN_STYLES).toContain(style);
    }
  });
});

/**
 * The forest scene's trees are GENERATED: per ridge, an inline SVG whose tile (ground, trunk halves,
 * crown facets, cast shadows) is built by a seeded generator and placed side by side with <use>. Three
 * properties keep that safe. It must be deterministic, or the server and the client draw different
 * forests and hydration mismatches. The tile repeats along x, so a ridge's ground has to end at the
 * height it starts at, or every repeat steps. And the light has to come from the disc: the facets on the
 * side facing it are the lit ones.
 */
describe("forest treelines", () => {
  const markup = (disc?: "left" | "center" | "right") => renderToStaticMarkup(<PatternBackground style="forest" disc={disc} />);
  const ridges = (html: string) =>
    [
      ...html.matchAll(/<svg class="fo-ridge fo-r(\d)"[^>]*viewBox="0 0 ([\d.]+) 100"[\s\S]*?<\/svg>/g),
    ].map((m) => ({
      index: Number(m[1]),
      svg: m[0],
      // The tile width: the viewBox spans one tile per <use>.
      width: Number(m[2]) / (m[0].match(/<use /g)?.length ?? 1),
    }));

  it("draws the same forest on every render", () => {
    expect(markup()).toBe(markup());
  });

  it("draws five ridges", () => {
    expect(ridges(markup())).toHaveLength(5);
  });

  it("ends each ridge at the height it starts at, so the tile repeats without a step", () => {
    for (const { svg, width, index } of ridges(markup())) {
      const ground = /<path d="([^"]+)" fill="url\(#[\w-]*fo-\d-ground\)"/.exec(svg)?.[1] ?? "";
      const points = [
        ...ground.matchAll(/(-?[\d.]+) (-?[\d.]+)/g),
      ].map((m) => [
        Number(m[1]),
        Number(m[2]),
      ]);
      const at = (x: number) => points.find(([px, py]) => px === x && py !== 100)?.[1];
      expect(at(0), `ridge ${index} at 0`).toBeDefined();
      expect(at(width), `ridge ${index} at ${width}`).toBeCloseTo(at(0) ?? Number.NaN, 1);
    }
  });

  it("defines every palette colour a ridge paints with, by day and by night", () => {
    // A ridge reads its colours from palette variables (--fo-r2-bark, …). One left undefined makes the
    // whole paint invalid, and the part silently draws nothing: the middle ridge's trunks did exactly that.
    const html = markup();
    const day = html.match(/(?:^|\n)\[data-pattern="forest"\]\s*\{([^}]+)\}/)?.[1] ?? "";
    const night = html.match(/(?:\.dark|:is\([^)]*\.dark[^)]*\))\s+\[data-pattern="forest"\]\s*\{([^}]+)\}/)?.[1] ?? "";
    const used = new Set(
      [
        ...html.matchAll(/var\(--(fo-r\d(?:-[a-z]+)*)\)/g),
      ].map((m) => m[1]),
    );
    for (const { index, svg } of ridges(html)) {
      const hasTrunks = svg.includes(`fo-${index}-barkLeft)"`);
      for (const name of [
        ...used,
      ].filter((n) => n === `fo-r${index}` || n.startsWith(`fo-r${index}-`))) {
        if (name.includes("bark") && !hasTrunks) continue;
        expect(day, `day --${name}`).toContain(`--${name}:`);
        expect(night, `night --${name}`).toContain(`--${name}:`);
      }
    }
  });

  it("keeps the clearing under the disc on the ridges that have one", () => {
    // The near ridges leave an opening in their trees and are shifted by the disc's placement, so you
    // look out at the sun or moon through the gap wherever it hangs. A ridge anchored at the left edge
    // instead would put a giant in front of the disc at some placements.
    const anchored = ridges(markup()).filter(({ svg }) => svg.includes("left:calc(var(--sw-disc-x"));
    expect(anchored.map((r) => r.index)).toEqual([
      2,
      3,
      4,
    ]);
  });

  it("lights the facets that face the disc", () => {
    expect(markup("left")).toContain("--fo-lit-l:1;--fo-lit-r:0");
    expect(markup("right")).toContain("--fo-lit-l:0;--fo-lit-r:1");
  });
});

/**
 * By day the aurora's reflection is a set of straight streaks (AuroraStreaks), one per ray of the curtain it
 * mirrors, generated from the same ray tile, each with a lighter core. Night keeps the gradient mirror, so
 * both sets render and CSS shows one per mode.
 */
describe("aurora rays", () => {
  // Safari 27.2 paints a TILED background (background-size + repeat) under a skew without the skew when the
  // skewed box has no layer of its own, and a still curtain has none: its rays stood straight up under its
  // slanted outline and met their reflections askew at the waterline. A repeating gradient is drawn skewed.
  const css = renderToStaticMarkup(<PatternBackground style="aurora" speed={0} />).replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (selector: string) =>
    [
      ...css.matchAll(/([^{}<>]*)\{([^{}]*)\}/g),
    ].find(([, s]) => s.trim() === selector)?.[2] ?? "";

  it("paints each curtain's rays as one repeating gradient, never a tile", () => {
    const paint = rule(".au-paint");
    expect(paint).toContain("background-image: var(--au-rays)");
    expect(paint).not.toMatch(/background-(size|repeat)\s*:/);
    for (const layer of [
      "a",
      "b",
      "c",
    ]) {
      const rays =
        rule(`.au-${layer}`)
          .match(/--au-rays:\s*([^;]+);/)?.[1]
          .trim() ?? "";
      // One period per tile: held open at 0 and at the full tile width.
      expect(rays, layer).toMatch(/^repeating-linear-gradient\(to right, transparent 0, /);
      expect(rays, layer).toMatch(/, transparent var\(--au-tile\)\)$/);
      expect(rays, layer).not.toMatch(/\d%/);
    }
  });
});

describe("aurora day reflection", () => {
  const markup = () => renderToStaticMarkup(<PatternBackground style="aurora" />);
  const streaks = (html: string) =>
    Object.fromEntries(
      [
        ...html.matchAll(/<div class="au-curtain au-([abc]) au-streaks">([\s\S]*?)<\/div>/g),
      ].map((m) => [
        m[1],
        m[2],
      ]),
    );
  // Rays per tile in AU_TILES: a has seven, b and c five each.
  const RAYS = {
    a: 7,
    b: 5,
    c: 5,
  };

  it("renders a streak mirror for each curtain beside the gradient one", () => {
    const html = markup();
    expect(Object.keys(streaks(html)).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
    for (const layer of [
      "a",
      "b",
      "c",
    ]) {
      expect(html).toContain(`au-curtain au-${layer} au-flat`);
    }
  });

  it("hides the other mode's mirror without stopping it, so a day/night switch keeps it in step", () => {
    // display: none stops an element's animations and showing it restarts them from zero, so after a switch
    // the reflection swayed out of step with the sky curtains it mirrors. Hidden, it keeps their clock.
    const rules = [
      ...markup()
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .matchAll(/([^{}<>]*)\{([^{}]*)\}/g),
    ].filter(([, selector]) => selector.split(",").some((s) => /\.au-(flat|streaks)$/.test(s.trim())));
    const gates = rules.filter(([, , body]) => /\b(display|visibility)\s*:/.test(body));
    expect(gates.map(([, selector]) => selector.replace(/\s+/g, " ").trim())).toEqual([
      '[data-pattern="aurora"] .au-flat, .dark [data-pattern="aurora"] .au-streaks',
      '.dark [data-pattern="aurora"] .au-flat',
    ]);
    for (const [selector, , body] of gates) expect(body, selector.trim()).not.toMatch(/\bdisplay\s*:/);
  });

  it("draws one straight streak and one core per ray, in the curtain's palette", () => {
    for (const [layer, svg] of Object.entries(streaks(markup()))) {
      const bodies = [
        ...svg.matchAll(/<path d="([^"]+)" fill="url\(#[\w-]*--au-[1-4]\)"/g),
      ].map((m) => m[1]);
      const cores = [
        ...svg.matchAll(/<path d="([^"]+)" fill="url\(#[\w-]*--au-[1-4]-core\)"/g),
      ].map((m) => m[1]);
      expect(bodies).toHaveLength(RAYS[layer as keyof typeof RAYS]);
      expect(cores).toHaveLength(RAYS[layer as keyof typeof RAYS]);
      // Straight: four corners, no curves.
      for (const d of [
        ...bodies,
        ...cores,
      ])
        expect(d).toMatch(/^M[\d.-]+ [\d.]+ L[\d.-]+ [\d.]+ L[\d.-]+ [\d.]+ L[\d.-]+ [\d.]+ Z$/);
    }
  });

  it("is deterministic", () => {
    expect(streaks(markup())).toEqual(streaks(markup()));
  });
});

/**
 * Chase: what Pac eats stays eaten (a wake strip behind him for the whole pass), and the wakes sit under every
 * sprite, so a Pac or ghost crossing another lane is never painted over by that lane's wake. Still (Speed 0 or
 * reduced motion), every lane holds a designed pose rather than its keyframe origin, off-screen.
 */
describe("chase", () => {
  const html = renderToStaticMarkup(<PatternBackground style="chase" speed={0} />);

  it("snaps the lanes to the pellet grid only where round() exists", () => {
    // round() reached Chrome and Edge in 125, below the floor. Written inline inside a calc() with var()s it
    // did not fall back: the property was left unset and every lane piled up at the top. The inline style
    // carries the nominal place; the stylesheet puts the lane there and snaps it under @supports, and the
    // snap must come AFTER the lane's own rule, or that rule's nominal place wins at equal specificity (the
    // N–S lanes once stood 2px off their dot column that way).
    const css = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/g) ?? []).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
    const lanes = [
      ...html.matchAll(/class="pac-(v?)lane[^"]*" style="([^"]*)"/g),
    ];
    expect(lanes.length).toBeGreaterThan(0);
    for (const [, vertical, style] of lanes) {
      expect(style, style).toContain(vertical ? "--pac-left:" : "--pac-top:");
      expect(style, style).not.toContain("round(");
    }
    // Each @supports block, as [start, end, body], by brace matching.
    const supports: [
      number,
      number,
      string,
    ][] = [];
    for (const m of css.matchAll(/@supports \(width: round\(1px, 2px\)\)\s*\{/g)) {
      const from = m.index ?? 0;
      let depth = 1;
      let i = from + m[0].length;
      for (; i < css.length && depth > 0; i++) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}") depth--;
      }
      supports.push([
        from,
        i,
        css.slice(from, i),
      ]);
    }
    const guarded = (needle: RegExp) => supports.find(([, , body]) => needle.test(body));
    for (const [rule, prop, nominal] of [
      [
        "pac-lane",
        "top",
        "--pac-top",
      ],
      [
        "pac-vlane",
        "left",
        "--pac-left",
      ],
    ] as const) {
      const base = css.search(new RegExp(`\\.${rule}\\s*\\{[^}]*\\b${prop}:\\s*var\\(${nominal}\\)`));
      expect(base, `.${rule} places the lane at its nominal ${prop}`).toBeGreaterThanOrEqual(0);
      const snap = guarded(new RegExp(`\\.${rule}\\s*\\{\\s*${prop}:\\s*calc\\(round\\(down, var\\(${nominal}\\)`));
      expect(snap, `.${rule}'s snap sits under @supports`).toBeDefined();
      expect(snap?.[0], `.${rule}'s snap comes after its rule`).toBeGreaterThan(base);
    }
    // No round() anywhere else in the scene's CSS.
    let unguarded = css;
    for (const [, , body] of supports) unguarded = unguarded.replace(body, "");
    expect(unguarded).not.toContain("round(");
  });

  it("paints every wake before any sprite", () => {
    const lastWake = Math.max(html.lastIndexOf('class="pac-wake-runner"'), html.lastIndexOf('class="pac-vwake-runner"'));
    const firstSprite = Math.min(
      ...[
        "pac-runner",
        "pac-vrunner",
        "pac-ghost-runner",
        "pac-vghost-runner",
      ].map((c) => html.indexOf(`class="${c}`)),
    );
    expect(lastWake).toBeGreaterThan(-1);
    expect(firstSprite).toBeGreaterThan(lastWake);
  });

  it("gives every lane a still pose", () => {
    expect(html.match(/--pac-x:\d+vw;--ghost-x:\d+vw/g)).toHaveLength(2 * 5);
    expect(html.match(/--pac-y:\d+vh;--ghost-y:\d+vh/g)).toHaveLength(2 * 2);
  });
});
