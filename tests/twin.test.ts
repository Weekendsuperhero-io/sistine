/**
 * The default Button's TWIN: the other mode's glass (tokens.css --twin-*, composed in engine.css). By day it is
 * the deep night glass at the night wash's lightness (L35), capped by the night wash's own hue-following fit;
 * at night the pale day glass at L88 with a fixed cap. Three things keep it honest:
 *   - the day cap is the night wash's L35 fit copied as written, so this holds the copy identical to the
 *     original (a regenerated fit cannot leave the twin's stale);
 *   - its own ink clears the APCA body floor on its fill for every preset, by day and at night;
 *   - it is the OPPOSITE mode's surface: dark by day, light at night.
 * check-gamut sweeps the fill and the ink against the sRGB ceiling (it reads every colour composed from
 * --glass-tint-c and the cap it writes).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { apcaContrast } from "@/lib/oklch-utils";
import { colorOf, html, presetNames } from "./theme-cascade";

/** The declaration `name` in the first rule of tokens.css whose selector list starts with `selectorStart`. */
function declaration(css: string, selectorStart: string, name: string): string {
  const block = css.indexOf(selectorStart);
  expect(block, selectorStart).toBeGreaterThanOrEqual(0);
  const at = css.indexOf(`  ${name}:`, block);
  let depth = 0;
  let i = at + name.length + 3;
  for (; i < css.length; i++) {
    if (css[i] === "(") depth++;
    else if (css[i] === ")") depth--;
    else if (css[i] === ";" && depth === 0) break;
  }
  return css
    .slice(at + name.length + 3, i)
    .replace(/\s+/g, " ")
    .trim();
}

describe("the default Button's twin", () => {
  const tokens = readFileSync(join(process.cwd(), "app/theme/tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("caps by day with the night wash's own L35 fit, copied as written", () => {
    const nightWash = declaration(tokens, ".dark,\n.dark[data-glass-tint],\n.dark [data-glass-tint] {", "--glass-wash-c-max");
    const twinDay = declaration(tokens, ":root,\n[data-glass-tint] {\n  --glass-wash-hue-hi", "--twin-c-max");
    expect(nightWash.length).toBeGreaterThan(400);
    expect(twinDay).toBe(nightWash);
  });

  it.each(presetNames())("reads on %s, by day and at night, and is the other mode's surface", (preset) => {
    for (const dark of [
      false,
      true,
    ]) {
      const chain = html(dark, preset);
      const bg = colorOf("--twin-bg", chain);
      const fg = colorOf("--twin-fg", chain);
      const lc = Math.abs(
        apcaContrast(
          {
            l: fg.l,
            c: fg.c,
            h: fg.h,
          },
          {
            l: bg.l,
            c: bg.c,
            h: bg.h,
          },
        ),
      );
      expect(lc, `${preset} ${dark ? "night" : "day"}: ink on the twin`).toBeGreaterThanOrEqual(75);
      // Dark glass with light ink by day, light glass with dark ink at night.
      if (dark) expect(bg.l, `${preset} night`).toBeGreaterThan(fg.l);
      else expect(bg.l, `${preset} day`).toBeLessThan(fg.l);
    }
  });
});
