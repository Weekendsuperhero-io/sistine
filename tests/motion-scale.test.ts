/**
 * Every timing the theme writes by hand runs through `--motion-scale`, so a consumer's app-wide motion speed
 * (0 = nothing moves, 2 = half speed, 0.667 = 1.5x; unset = 1) reaches it. Tailwind's own duration classes
 * are the consumer's to scale through its theme tokens; this pins the theme's hand-written ones.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const THEME = "app/theme";
const TIMING_PROPS = /\b(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)\s*:\s*([^;{}]+);/g;
const TIME = /(?<![\w-])\d*\.?\d+m?s\b/;

/** One rule the scale deliberately does not reach, with why. */
const EXEMPT = new Map([
  [
    "utilities.css: animation-duration: 3s",
    "the OS reduced-motion slowdown for the spinner: a floor under the person's own setting, not a speed",
  ],
]);

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

function timings() {
  const found: {
    where: string;
    value: string;
  }[] = [];
  for (const file of readdirSync(THEME).filter((f) => f.endsWith(".css"))) {
    const css = withoutComments(readFileSync(join(THEME, file), "utf8"));
    for (const [, prop, value] of css.matchAll(TIMING_PROPS)) {
      if (TIME.test(value))
        found.push({
          where: `${file}: ${prop}: ${value.trim()}`,
          value,
        });
    }
  }
  return found;
}

describe("the motion scale", () => {
  it("reaches every hand-written timing in the theme", () => {
    const unscaled = timings()
      .filter(({ value }) => !value.includes("var(--motion-scale, 1)"))
      .map(({ where }) => where)
      .filter((where) => !EXEMPT.has(where));
    expect(unscaled).toEqual([]);
  });

  it("finds the timings it pins, so the scan cannot pass empty", () => {
    expect(timings().filter(({ value }) => value.includes("var(--motion-scale, 1)")).length).toBeGreaterThanOrEqual(6);
  });

  it("keeps each exemption real", () => {
    const where = new Set(timings().map((t) => t.where));
    for (const key of EXEMPT.keys()) expect(where.has(key), key).toBe(true);
  });

  it("restates the shimmer's duration on the scale, ahead of the reduced-motion stop", () => {
    const css = withoutComments(readFileSync(join(THEME, "utilities.css"), "utf8"));
    const scaled = css.indexOf("animation-duration: calc(2s * var(--motion-scale, 1))");
    const stop = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(scaled).toBeGreaterThan(-1);
    expect(stop).toBeGreaterThan(scaled);
  });
});
