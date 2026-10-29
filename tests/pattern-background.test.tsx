import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ANIMATED_PATTERNS, DISC_PATTERNS, PATTERN_STYLES, PatternBackground, stopRules } from "@/components/pattern-background";

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
 * layer), and a box that is a layer of its own (a swaying curtain, the sun path that moves with the disc)
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
