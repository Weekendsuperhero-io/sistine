/**
 * Text under a fresco is solved against the fresco's hardest stop.
 *
 * The four frescoes (muse, sistine, aurora, gloaming) paint a bold multi-hue sheet over every material:
 * stops at L78–89, chroma up to 0.2, alpha 0.2–0.46. AutoForeground used to band text against the plain
 * surface, so text sized for the average dipped to 66–74 Lc wherever a stop pulled the surface toward
 * it. It now reads the sheet (--glass-crystal-fresco), finds the stop that leaves the least contrast for
 * the text's polarity, and solves against that composite.
 */
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AutoForeground } from "@/components/auto-foreground";
import {
  apcaContrast,
  compositeSurface,
  glassSolidSurface,
  limitingSurface,
  type OklchColor,
  parseGradientStops,
  parseOklch,
  READABLE_USAGE,
} from "@/lib/oklch-utils";

const root = () => document.documentElement;
const read = (name: string) => root().style.getPropertyValue(name).trim();
const fg = (name: string): OklchColor => {
  const c = parseOklch(read(name));
  if (!c) throw new Error(`${name} is not oklch: ${read(name) || "(empty)"}`);
  return c;
};

/* Gloaming's light sheet: a warm stop, a rose stop, and the violet one that limits dark text. */
const FRESCO = "linear-gradient(135deg in oklch, oklch(89% 0.12 62 / 0.32) 0%, oklch(84% 0.14 350 / 0.3) 50%, oklch(78% 0.13 278 / 0.3) 100%)";

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

describe("parseGradientStops", () => {
  it("reads each oklch stop as a compositable layer", () => {
    expect(parseGradientStops(FRESCO)).toEqual([
      {
        l: 89,
        c: 0.12,
        h: 62,
        a: 0.32,
      },
      {
        l: 84,
        c: 0.14,
        h: 350,
        a: 0.3,
      },
      {
        l: 78,
        c: 0.13,
        h: 278,
        a: 0.3,
      },
    ]);
  });

  it("accepts fractional lightness and percent alpha, and defaults alpha to 1", () => {
    expect(parseGradientStops("linear-gradient(oklch(0.8 0.1 200 / 50%), oklch(0.5 0 0))")).toEqual([
      {
        l: 80,
        c: 0.1,
        h: 200,
        a: 0.5,
      },
      {
        l: 50,
        c: 0,
        h: 0,
        a: 1,
      },
    ]);
  });

  it("finds nothing when no fresco is set", () => {
    expect(parseGradientStops("")).toEqual([]);
  });
});

describe("limitingSurface", () => {
  const light: OklchColor = {
    l: 90,
    c: 0.02,
    h: 30,
  };
  const dark: OklchColor = {
    l: 30,
    c: 0.02,
    h: 30,
  };
  const stops = parseGradientStops(FRESCO);

  it("returns the surface itself without a fresco", () => {
    expect(limitingSurface(light, [])).toBe(light);
  });

  it("picks the DARKEST stop composite under dark text (a light surface)", () => {
    const worst = limitingSurface(light, stops);
    const all = stops.map((s) =>
      compositeSurface(light, [
        s,
      ]),
    );
    expect(worst.l).toBeCloseTo(Math.min(...all.map((s) => s.l)), 5);
  });

  it("picks the LIGHTEST stop composite under light text (a dark surface)", () => {
    const worst = limitingSurface(dark, stops);
    const all = stops.map((s) =>
      compositeSurface(dark, [
        s,
      ]),
    );
    expect(worst.l).toBeCloseTo(Math.max(...all.map((s) => s.l)), 5);
  });
});

describe("AutoForeground under a fresco", () => {
  /* The surface AutoForeground models for the page with this tint (its jsdom fallbacks, light mode). */
  const H = 32;
  const C = 0.089;
  const A = 0.12;
  const plain = glassSolidSurface(
    false,
    {
      h: H,
      c: C,
      a: A,
    },
    0.65,
    72,
    2.5,
    {
      l: 92,
      c: Math.min(C * 0.85, 0.055 * 0.65),
      a: 0.7,
    },
  );

  async function mount(fresco: string | null) {
    root().style.setProperty("--glass-tint-h", String(H));
    root().style.setProperty("--glass-tint-c", String(C));
    root().style.setProperty("--glass-tint-a", String(A));
    if (fresco) root().style.setProperty("--glass-crystal-fresco", fresco);
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground")).not.toBe(""));
  }

  it("keeps body text over the floor at the fresco's hardest stop", async () => {
    await mount(FRESCO);
    const worst = limitingSurface(plain, parseGradientStops(FRESCO));
    expect(Math.abs(apcaContrast(fg("--foreground"), worst))).toBeGreaterThanOrEqual(READABLE_USAGE.body.floor);
  });

  it("darkens the ink relative to the same tint without a fresco", async () => {
    await mount(null);
    const without = fg("--foreground");
    root().removeAttribute("style");
    document.body.innerHTML = "";
    await mount(FRESCO);
    expect(fg("--foreground").l).toBeLessThan(without.l);
  });
});
