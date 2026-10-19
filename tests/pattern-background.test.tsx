import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ANIMATED_PATTERNS, PATTERN_STYLES, PatternBackground, stopRules } from "@/components/pattern-background";

/**
 * A scene stops for two reasons — `prefers-reduced-motion` and Speed 0 — and the
 * bug these tests pin is the two DRIFTING APART: every scene honoured reduced
 * motion while Speed 0 only set `animation-play-state: paused`, which leaves the
 * element in an animating state and keeps WebKit re-rendering its layer
 * (`.au-curtain` carries a `filter: blur()` and a two-layer `mask-composite`, six
 * of them at full-viewport size). See AMXSF-562.
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

describe("ANIMATED_PATTERNS", () => {
  it("only names real pattern styles", () => {
    // The set gates the speed control; a stale name there means a scene whose
    // Speed 0 silently does nothing.
    for (const style of ANIMATED_PATTERNS) {
      expect(PATTERN_STYLES).toContain(style);
    }
  });
});
