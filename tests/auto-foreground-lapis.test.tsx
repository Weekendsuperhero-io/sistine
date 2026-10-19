/**
 * Lapis, light mode: body text must stay ink-blue, not #000002.
 *
 * Reported by the first consumer: on the dark-wash presets, plain body text solved to near-black
 * (#000002) in light mode, i.e. the hue was spent for a sliver of contrast. Lapis is the hardest case:
 * its wash sits at L46, the deepest in the palette, so its sheer surface is the darkest light-mode
 * surface the theme ships and the ramp's tinted steps have the least room above the body floor.
 *
 * What decides it is pickTonalInBand's legibility guard: when the best TONAL step misses the 75 Lc body
 * floor it hands back the raw ramp's extreme, and on a tinted ramp that extreme renders black. These
 * mount AutoForeground on lapis's own tokens (presets.css) and measure the colour it actually emits
 * against the surface check-contrast models, so they test the shipped token, not a parallel solve.
 *
 * Reproducing it first showed the shipped backing (solidify L92, at the default opacity and at the
 * consumer's 0.8) was never affected: L20 renders #09014e and clears the floor with room to spare. The
 * report came from a darker backing, and there the guard's trade was unbounded. The consumer also carried
 * a second hunk that dropped ramp steps by measured luminance (lapis L20 measures Ys 0.0042); it is NOT
 * ported, because it removes exactly the step that keeps lapis ink-blue, at any backing.
 */
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AutoForeground } from "@/components/auto-foreground";
import {
  apcaContrast,
  glassSolidSurface,
  type OklchColor,
  oklchToSrgb,
  parseOklch,
  READABLE_USAGE,
  TONAL_HUE_SLACK_LC,
  TONAL_MIN_L,
} from "@/lib/oklch-utils";

/* presets.css, [data-glass-tint="lapis"] (light). */
const LAPIS = {
  h: 268,
  c: 0.085,
  a: 0.13,
  washL: 46,
  opaqueCMax: 0.055,
};
/* tokens.css :root: the solid floor alpha, the solidify floor's chroma scale and its derived cap. */
const SOLID_A = 0.65;
const OPAQUE_C_SCALE = 0.85;
const SOLIDIFY_C_MAX = LAPIS.opaqueCMax * 0.65;
/* check-contrast's [margin]: the floor plus 1.5 Lc of slack. */
const BODY_WITH_MARGIN = READABLE_USAGE.body.floor + 1.5;

const root = () => document.documentElement;
const read = (name: string) => root().style.getPropertyValue(name).trim();

/** The surface body text sits on, composed the way check-contrast and AutoForeground compose it. */
function lapisSurface(solidifyL: number, opacity: number): OklchColor {
  return glassSolidSurface(
    false,
    {
      h: LAPIS.h,
      c: LAPIS.c,
      a: LAPIS.a,
    },
    SOLID_A,
    LAPIS.washL,
    2.5,
    {
      l: solidifyL,
      c: Math.min(LAPIS.c * OPAQUE_C_SCALE, SOLIDIFY_C_MAX),
      a: opacity,
    },
  );
}

async function mountLapis(opts: { solidifyL?: number; opacity?: number } = {}) {
  const s = root().style;
  s.setProperty("--glass-tint-h", String(LAPIS.h));
  s.setProperty("--glass-tint-c", String(LAPIS.c));
  s.setProperty("--glass-tint-a", String(LAPIS.a));
  s.setProperty("--glass-wash-l", `${LAPIS.washL}%`);
  s.setProperty("--glass-opaque-c-max", String(LAPIS.opaqueCMax));
  if (opts.solidifyL !== undefined) s.setProperty("--glass-solidify-l", String(opts.solidifyL));
  if (opts.opacity !== undefined) s.setProperty("--glass-opacity", String(opts.opacity));
  render(<AutoForeground />);
  await waitFor(() => expect(read("--foreground")).not.toBe(""));
  const body = parseOklch(read("--foreground"));
  if (!body) throw new Error(`--foreground is not oklch: ${read("--foreground")}`);
  return body;
}

function expectInkBlue(body: OklchColor, surface: OklchColor) {
  const lc = Math.abs(apcaContrast(body, surface));
  const rgb = oklchToSrgb(body.l, body.c, body.h);
  const label = `--foreground L${body.l.toFixed(1)} C${body.c.toFixed(3)} on surface L${surface.l.toFixed(1)} (${lc.toFixed(1)} Lc)`;
  expect(body.l, `${label}: below the tonal clip, i.e. the raw ramp's black end`).toBeGreaterThanOrEqual(TONAL_MIN_L);
  /* The honest black test is the rendered channels, not the requested chroma: at L≈0 any chroma renders
     #000000, and lapis L20 renders #09014e, whose brightest channel (blue) is ~0.31. */
  expect(Math.max(...rgb), `${label}: renders black (sRGB ${rgb.map((v) => v.toFixed(3))})`).toBeGreaterThanOrEqual(0.1);
  expect(lc, `${label}: under the body floor plus margin`).toBeGreaterThanOrEqual(BODY_WITH_MARGIN);
}

beforeEach(() => {
  localStorage.clear();
  root().className = "";
  root().removeAttribute("style");
});

afterEach(() => {
  localStorage.clear();
  root().className = "";
  root().removeAttribute("style");
});

describe("AutoForeground on lapis, light mode", () => {
  it("keeps body text ink-blue on the shipped backing (solidify L92)", async () => {
    const body = await mountLapis();
    expectInkBlue(body, lapisSurface(92, 0.7));
  });

  it("keeps body text ink-blue at a higher --glass-opacity", async () => {
    const body = await mountLapis({
      opacity: 0.8,
    });
    expectInkBlue(body, lapisSurface(92, 0.8));
  });

  /* The older L88 backing, which the consumer's measurement was assumed to match. It does not reproduce
     the report under today's compositing: the surface lands at L84.9 and the L20 step clears the floor
     (75.2 Lc), so the guard never fires. Pinned so a model change that tips it under is caught here. */
  it("keeps body text ink-blue on the older L88 backing", async () => {
    const surface = lapisSurface(88, 0.7);
    const body = await mountLapis({
      solidifyL: 88,
    });
    expect(body.l).toBeGreaterThanOrEqual(TONAL_MIN_L);
    expect(Math.abs(apcaContrast(body, surface))).toBeGreaterThanOrEqual(READABLE_USAGE.body.floor);
  });

  /* The REPORTED shape, reproduced: the tinted L20 step misses the floor (73.0 Lc) and the black end
     misses it too (74.8), so the guard spent the whole hue on 1.8 Lc that still was not legible. Bounded
     now: a tonal pick within TONAL_HUE_SLACK_LC of the floor beats an extreme that misses it as well. */
  it("keeps the hue when black would still miss the floor (L86 backing)", async () => {
    const surface = lapisSurface(86, 0.7);
    const body = await mountLapis({
      solidifyL: 86,
    });
    const lc = Math.abs(apcaContrast(body, surface));
    const rgb = oklchToSrgb(body.l, body.c, body.h);
    expect(body.l, `L${body.l.toFixed(1)} at ${lc.toFixed(1)} Lc on L${surface.l.toFixed(1)}`).toBeGreaterThanOrEqual(TONAL_MIN_L);
    expect(Math.max(...rgb)).toBeGreaterThanOrEqual(0.1);
    expect(lc).toBeGreaterThanOrEqual(READABLE_USAGE.body.floor - TONAL_HUE_SLACK_LC);
  });

  /* The other side of the bound. At the consumer's reported surface (L84.2, an 86.8 backing) black DOES
     clear the floor (75.7 Lc) and L20 does not (73.9), and legibility outranks hue: that is the line
     check-contrast signs the presets off against, so the guard must still take the extreme here. */
  it("still prefers a fallback that clears the floor (the reported L84.2 surface)", async () => {
    const surface = lapisSurface(86.8, 0.7);
    const body = await mountLapis({
      solidifyL: 86.8,
    });
    expect(body.l).toBeLessThan(TONAL_MIN_L);
    expect(Math.abs(apcaContrast(body, surface))).toBeGreaterThanOrEqual(READABLE_USAGE.body.floor);
  });
});
