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
import { AutoForeground, FG_EVENT } from "@/components/auto-foreground";
import {
  apcaContrast,
  compositeSurface,
  glassSolidSurface,
  nightWashCap,
  type OklchColor,
  oklchToSrgb,
  parseOklch,
  READABLE_USAGE,
  TONAL_HUE_SLACK_LC,
  TONAL_MIN_L,
} from "@/lib/oklch-utils";
import { colorOf, html, numberOf, themeTokenCss } from "./theme-cascade";

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

/**
 * Lapis at NIGHT, deep night: the wash paints at the darker of lapis's own L46 and the night depth (35),
 * so text has to be solved against THAT surface. Lapis is the closest call in the palette (its own wash is
 * only 11 L above the depth, where aventurine's is 53), so a model that skipped the min would be wrong by
 * the least here, and this is where the discriminator below is tightest.
 *
 * Mounted on the SHIPPED tokens, not a copy: the theme's token rules go into a <style>, jsdom cascades
 * them onto <html class="dark" data-glass-tint="lapis">, and AutoForeground reads them as it does in a
 * browser. The surface it should solve against comes from the same CSS through tests/theme-cascade.
 */
describe("AutoForeground on lapis, night (deep night)", () => {
  let style: HTMLStyleElement | undefined;
  afterEach(() => {
    style?.remove();
    delete root().dataset.glassTint;
  });

  const NIGHT = html(true, "lapis");
  /** The opaque card as the CSS paints it: --glass-opaque-bg under --glass-tint-wash. */
  const opaqueCard = (washL: number): OklchColor => {
    const floor = colorOf("--glass-opaque-bg", NIGHT);
    const wash = colorOf("--glass-tint-wash", NIGHT);
    return compositeSurface(floor, [
      {
        ...wash,
        l: washL,
      },
    ]);
  };

  async function mountLapisNight() {
    style = document.createElement("style");
    style.textContent = themeTokenCss();
    document.head.append(style);
    root().className = "dark";
    root().dataset.glassTint = "lapis";
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-opaque")).not.toBe(""));
  }

  it("paints lapis's night wash at the depth, in gamut, at lapis's own chroma", () => {
    const wash = colorOf("--glass-tint-wash", NIGHT);
    expect(numberOf("--glass-wash-l", NIGHT)).toBe(46);
    expect(wash.l).toBeCloseTo(35, 6);
    // Lapis asks 0.085 × 2.5 = 0.2125, under its own L35 ceiling: its night pin keeps all of it.
    expect(wash.c).toBeCloseTo(0.2125, 6);
  });

  it("solves the opaque card against the deep wash (L35), not lapis's own L46", async () => {
    await mountLapisNight();
    const ink = parseOklch(read("--foreground-opaque"));
    if (!ink) throw new Error(`--foreground-opaque is not oklch: ${read("--foreground-opaque")}`);
    /* The opaque tier aims body 80 + LC_AIM_KNOWN 4 = 84 on whichever surface it modelled. Modelled at the
       depth, it reads 84 on the card the CSS paints; modelled at L46 (no min), it reads 84 on a card the
       CSS does not paint, and several Lc off on the real one. */
    expect(Math.abs(apcaContrast(ink, opaqueCard(35)))).toBeCloseTo(84, 0);
    expect(Math.abs(apcaContrast(ink, opaqueCard(46)))).not.toBeCloseTo(84, 0);
  });

  it("keeps night body text light and over the floor on the deep surface", async () => {
    await mountLapisNight();
    const body = parseOklch(read("--foreground"));
    if (!body) throw new Error(`--foreground is not oklch: ${read("--foreground")}`);
    const solidify = colorOf("--glass-solidify-bg", NIGHT);
    const wash = colorOf("--glass-tint-wash", NIGHT);
    const surface = glassSolidSurface(
      true,
      {
        h: wash.h,
        c: numberOf("--glass-tint-c", NIGHT),
        a: wash.a,
      },
      numberOf("--glass-solid-a", NIGHT),
      wash.l,
      numberOf("--glass-wash-c-mult", NIGHT),
      {
        l: solidify.l,
        c: solidify.c,
        a: 0.7,
      },
      numberOf("--glass-solid-l", NIGHT),
      numberOf("--glass-wash-c-max", NIGHT),
    );
    expect(body.l).toBeGreaterThan(80);
    expect(Math.abs(apcaContrast(body, surface))).toBeGreaterThanOrEqual(BODY_WITH_MARGIN);
  });
});

/**
 * A DRAG off lapis at night. The switcher's tweak() drops the attribute (the tint becomes a custom colour)
 * and hands AutoForeground a snapshot of the tint, with no DOM read. The night wash cap is a function of
 * the wash hue (tokens.css), so the snapshot's --glass-tint-h is all the model needs: it must band the
 * opaque card against the wash the browser paints, at lapis's own hue ceiling, not the 0.057 flat guard
 * that used to cut a custom blue to a quarter of what its hue holds.
 */
describe("AutoForeground on a drag off lapis, night (snapshot path)", () => {
  const H = 268;
  const C = 0.086; // one step of the chroma slider off lapis's 0.085
  const A = 0.54;
  /** The opaque card the CSS paints at night for this custom tint: the L33.4 floor under the deep wash. */
  const card = (washCap: number): OklchColor =>
    compositeSurface(
      {
        l: 33.4,
        c: Math.min(C * 0.98, 0.12),
        h: H,
      },
      [
        {
          l: 35,
          c: Math.min(C * 2.5, washCap),
          h: H,
          a: A,
        },
      ],
    );

  it("models the painted wash from the snapshot's hue", async () => {
    root().className = "dark";
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-opaque")).not.toBe(""));
    window.dispatchEvent(
      new CustomEvent(FG_EVENT, {
        detail: {
          "--glass-fg-h": H,
          "--glass-tint-h": H,
          "--glass-tint-c": C,
          "--glass-tint-a": A,
          "--harmony-h": H,
          "--glass-opaque-l": 33.4,
          "--accent-h": Number.NaN,
          "--accent-c": 0.15,
        },
      }),
    );
    await waitFor(() =>
      expect(Math.abs(apcaContrast(parseOklch(read("--foreground-opaque")) as OklchColor, card(nightWashCap(H))))).toBeCloseTo(84, 0),
    );
    const ink = parseOklch(read("--foreground-opaque")) as OklchColor;
    expect(Math.abs(apcaContrast(ink, card(0.057)))).not.toBeCloseTo(84, 0);
  });
});
