/**
 * Text sits at the hue of the SURFACE it is painted on, not at the hue the tint token declares.
 *
 * `--glass-tint-h` describes the WASH. What a reader actually sees is that wash composited over the
 * solid/solidify floor, and that mix does not travel a radial path through the hue plane: the floor is
 * near-neutral, so it has almost no hue to interpolate toward, and the composite lands a few degrees off
 * the declared angle. Measured on the shipped light presets: rose 8 → 2.5, goldstone 22 → 17.1,
 * lapis 268 → 271.7. Seeding the foreground ramp from `--glass-tint-h` therefore painted text at an angle
 * the surface underneath it never occupies.
 *
 * The gap is small in absolute terms, which is exactly why it needs pinning rather than eyeballing — it
 * is invisible in a screenshot and silent in every other suite, but it is the difference between "tonal
 * text, same hue as its surface" and "text near the surface's hue".
 *
 * OPAQUE is the control. It is a solid painted colour with nothing composited over it, so its hue IS
 * `--glass-tint-h`; if a change ever blanket-rotated every tier, this is the assertion that would catch it.
 */
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AutoForeground } from "@/components/auto-foreground";
import { glassSolidSurface, type OklchColor, parseOklch } from "@/lib/oklch-utils";

const root = () => document.documentElement;
const read = (name: string) => root().style.getPropertyValue(name).trim();
const fg = (name: string): OklchColor => {
  const c = parseOklch(read(name));
  if (!c) throw new Error(`${name} is not oklch: ${read(name) || "(empty)"}`);
  return c;
};

/** Signed shortest angular distance a → b, in degrees. */
const hueGap = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;

const TINT_C = 0.09;
const TINT_A = 0.15;

/** The veiled surface the component models, mirroring its jsdom fallbacks exactly. */
const normalSurface = (h: number) =>
  glassSolidSurface(
    false,
    {
      h,
      c: TINT_C,
      a: TINT_A,
    },
    0.65,
    72,
    2.5,
    {
      // The SOLIDIFY floor (--glass-solidify-l / -c-max), not the opaque one — the backing under sheer
      // glass is its own surface. Light lifts it to 92 with the cap derived as opaque-c-max × 0.65.
      l: 92,
      c: Math.min(TINT_C * 0.85, 0.055 * 0.65),
      a: 0.7,
    },
  );

async function mountTinted(hue: number) {
  root().style.setProperty("--glass-tint-h", String(hue));
  root().style.setProperty("--glass-tint-c", String(TINT_C));
  root().style.setProperty("--glass-tint-a", String(TINT_A));
  render(<AutoForeground />);
  await waitFor(() => expect(read("--foreground")).not.toBe(""));
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

describe("AutoForeground: ink follows its surface's hue", () => {
  it.each([
    [
      "rose-ish",
      8,
    ],
    [
      "goldstone-ish",
      22,
    ],
    [
      "warm",
      75,
    ],
    [
      "green",
      145,
    ],
    [
      "blue",
      268,
    ],
  ])("puts --foreground at the composited surface hue on a %s tint", async (_label, hue) => {
    await mountTinted(hue);

    const surface = normalSurface(hue);
    const ink = fg("--foreground");

    expect(Math.abs(hueGap(ink.h, surface.h)), `ink h${ink.h.toFixed(2)} vs surface h${surface.h.toFixed(2)}`).toBeLessThan(1);
  });

  it("does NOT simply reuse --glass-tint-h", async () => {
    /* The assertion above passes trivially if the surface happens to sit at the tint hue, so prove the
       two are actually distinguishable on a hue where the composite drifts most (h8 → ~3.3, 4.7° away).
       Without this, seeding the ramp from tintH again would go unnoticed. */
    const hue = 8;
    await mountTinted(hue);

    const surface = normalSurface(hue);
    expect(Math.abs(hueGap(surface.h, hue)), "surface must drift off the tint hue for this to test anything").toBeGreaterThan(2);
    expect(Math.abs(hueGap(fg("--foreground").h, hue))).toBeGreaterThan(2);
  });

  it("keeps the OPAQUE tier at the tint hue, since nothing composites over it", async () => {
    /* --glass-opaque-bg is painted solid: no wash above it, so no drift. This is the control that a fix
       for the sheer surfaces did not blanket-rotate every tier. */
    const hue = 8;
    await mountTinted(hue);

    expect(Math.abs(hueGap(fg("--foreground-opaque").h, hue))).toBeLessThan(1);
  });

  it("puts --foreground-ui at the composited surface hue too", async () => {
    /* Icons take the same rule as text when iconHue is null: follow THIS surface's composited hue, so an
       icon sits at the same angle as the material behind it. It solves on a separate path from the text
       tiers (its own ui band, its own hue resolution), so passing there says nothing about here. */
    for (const hue of [
      8,
      22,
      268,
    ]) {
      root().removeAttribute("style");
      await mountTinted(hue);
      const surface = normalSurface(hue);
      expect(Math.abs(hueGap(fg("--foreground-ui").h, surface.h)), `--foreground-ui on h${hue}`).toBeLessThan(1);
    }
  });

  it("drifts the icon tiers off the tint hue on the crystal and chakra stacks", async () => {
    /* The discriminating half: --foreground-ui* must track its own material's composite, not the raw
       token. h8 drifts ~4.7°, so a tier still sitting at 8 would fail this. */
    const hue = 8;
    await mountTinted(hue);

    for (const tier of [
      "--foreground-ui",
      "--foreground-ui-crystal",
      "--foreground-ui-chakra",
    ]) {
      expect(Math.abs(hueGap(fg(tier).h, hue)), `${tier} sat back at the tint hue`).toBeGreaterThan(1);
    }
    // Opaque is the control here as well: nothing composites over it, so its icon stays at the tint hue.
    expect(Math.abs(hueGap(fg("--foreground-ui-opaque").h, hue))).toBeLessThan(1);
  });

  it("matches ink to surface on the crystal and chakra stacks too", async () => {
    /* Both composite their own layer stacks, so each lands at its own angle — and each one's text should
       follow ITS surface, not the page's. They differ from the normal surface by well under a JND, so the
       assertion is that they track the sheer drift rather than sitting back at the tint hue. */
    const hue = 8;
    await mountTinted(hue);

    for (const tier of [
      "--foreground-crystal",
      "--foreground-chakra",
    ]) {
      expect(Math.abs(hueGap(fg(tier).h, hue)), `${tier} sat back at the tint hue`).toBeGreaterThan(1);
    }
  });
});
