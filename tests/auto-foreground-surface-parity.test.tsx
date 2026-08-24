/**
 * Surface parity — every material's text tiers must land at a comparable APCA Lc.
 *
 * AutoForeground bands a tier set per SURFACE (normal glass floor, then `-opaque`, `-crystal`,
 * `-chakra`). Each set is solved independently, so nothing structurally stops one surface from
 * drifting well below the others while still satisfying its own declared band — which is exactly what
 * happened to `-opaque`: it was the only `applyTiers()` call passing no margin at all, so it aimed at
 * the BARE band target (body 80.0 / muted 72.0) while every other surface aimed 3.6–5.7 Lc higher.
 * Same paragraph, visibly softer card. Its band was never violated, so a per-surface floor assertion
 * would not have caught it; only comparing the surfaces to EACH OTHER does.
 *
 * These tests measure the emitted tokens the way a reader sees them — |Lc| of the solved foreground
 * against the surface it is painted on — and assert the four surfaces stay clustered.
 *
 * jsdom resolves no stylesheets, so every `num(name, fallback)` in the component takes its fallback;
 * the surface models below mirror those same fallbacks (tint chroma/alpha 0, hue 255, solid-a 0.65).
 */
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AutoForeground } from "@/components/auto-foreground";
import { apcaContrast, glassSolidSurface, type OklchColor, parseOklch } from "@/lib/oklch-utils";

const root = () => document.documentElement;
const read = (name: string) => root().style.getPropertyValue(name).trim();

const fg = (name: string): OklchColor => {
  const v = read(name);
  const c = parseOklch(v);
  if (!c) throw new Error(`${name} is not an oklch() value: ${v || "(empty)"}`);
  return c;
};

/** |APCA Lc| of an emitted tier token against the surface it is painted on. */
const lcOn = (token: string, surface: OklchColor) => Math.abs(apcaContrast(fg(token), surface));

/**
 * The four surface models, mirroring the component's jsdom-fallback inputs exactly. Kept in step with
 * the `applyTiers()` call sites in components/auto-foreground.tsx.
 */
const surfaces = (dark: boolean): Record<string, OklchColor> => {
  const h = 255;
  const washL = dark ? 58 : 72;
  const crysA = dark ? 0.1 : 0.3;
  const glossL = dark ? 66 : 97;
  const GLOSS_TOP_A = 0.2;
  // The solidify floor (--glass-opacity, 0.7 fallback) paints over every SHEER material's background
  // colour and under its image stack, so each sheer model composites toward it. Chroma is 0 throughout
  // here because jsdom resolves --glass-tint-c to its 0 fallback.
  const opacity = 0.7;
  const opaqueL = dark ? 36.4 : 90.9;
  const solidified = (l: number) => l * (1 - opacity) + opaqueL * opacity;
  const solidify = {
    l: opaqueL,
    c: 0,
    a: opacity,
  };
  const floorL = solidified((dark ? 20 : 95) * (1 - crysA) + 100 * crysA);
  return {
    "": glassSolidSurface(
      dark,
      {
        h,
        c: 0,
        a: 0,
      },
      0.65,
      washL,
      2.5,
      solidify,
    ),
    "-opaque": {
      l: opaqueL,
      c: 0,
      h,
    },
    "-crystal": {
      l: floorL * (1 - GLOSS_TOP_A) + glossL * GLOSS_TOP_A,
      c: 0,
      h,
    },
    "-chakra": {
      l: solidified(dark ? 28 : 88),
      c: 0,
      h,
    },
  };
};

beforeEach(() => {
  localStorage.clear();
  root().className = "";
  root().removeAttribute("style");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  root().className = "";
  root().removeAttribute("style");
});

const mount = async (dark: boolean) => {
  if (dark) root().classList.add("dark");
  render(<AutoForeground />);
  await waitFor(() => expect(read("--foreground-chakra")).not.toBe(""));
};

describe.each([
  [
    "light",
    false,
  ],
  [
    "dark",
    true,
  ],
])("AutoForeground surface parity (%s)", (_label, dark) => {
  /**
   * The guard the original defect needed. `-opaque` sat at body 80.0 / muted 72.0 — the raw band
   * targets — while the other three sat 2–7 Lc higher, in every tint and both modes.
   */
  it.each([
    [
      "--foreground",
      6,
    ],
    [
      "--muted-foreground",
      6,
    ],
  ])("clusters %s across all four surfaces", async (base, maxSpread) => {
    await mount(dark);

    const measured = Object.entries(surfaces(dark)).map(([suffix, surface]) => ({
      suffix: suffix || "(normal)",
      lc: lcOn(`${base}${suffix}`, surface),
    }));
    const lcs = measured.map((m) => m.lc);
    const spread = Math.max(...lcs) - Math.min(...lcs);

    expect(spread, `${base} spread across surfaces: ${measured.map((m) => `${m.suffix} ${m.lc.toFixed(1)}`).join(", ")}`).toBeLessThanOrEqual(
      maxSpread,
    );
  });

  it("does not leave -opaque the softest surface", async () => {
    await mount(dark);

    const s = surfaces(dark);
    const opaque = lcOn("--foreground-opaque", s["-opaque"]);
    const others = [
      "",
      "-crystal",
      "-chakra",
    ].map((suffix) => lcOn(`--foreground${suffix}`, s[suffix]));

    // Not merely ">= the minimum": opaque must sit inside the pack, above at least one other surface.
    expect(opaque, `opaque ${opaque.toFixed(1)} vs others ${others.map((o) => o.toFixed(1)).join(", ")}`).toBeGreaterThan(Math.min(...others) - 1);
  });

  /**
   * Pins the LC_AIM_KNOWN baseline itself. `-opaque` is the one floor modelled exactly, so it earns no
   * uncertainty margin — without a separate baseline aim it lands on the bare band target. Body aims
   * 80 + 4, muted 72 + 4; both are reachable in every mode here, so the solve is exact.
   */
  it("aims -opaque above the bare band target", async () => {
    await mount(dark);

    const s = surfaces(dark);
    expect(lcOn("--foreground-opaque", s["-opaque"])).toBeCloseTo(84, 0);
    expect(lcOn("--muted-foreground-opaque", s["-opaque"])).toBeCloseTo(76, 0);
  });
});
