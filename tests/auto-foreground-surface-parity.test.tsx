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
import { apcaContrast, compositeSurface, glassSolidSurface, type OklchColor, parseOklch } from "@/lib/oklch-utils";

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
  const opaqueL = dark ? 36.4 : 88;
  const solidify = {
    l: opaqueL,
    c: 0,
    h,
    a: opacity,
  };
  const page = {
    l: dark ? 20 : 95,
    c: 0,
    h,
  };
  // Same gloss ink both sheer materials bake; chroma 0 here because jsdom resolves --glass-tint-c to 0.
  const gloss = {
    l: glossL,
    c: 0,
    h,
    a: GLOSS_TOP_A,
  };
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
    // --glass-crystal-bg over the page, then solidify → wash → gloss. Composited in sRGB, the way the
    // browser paints it; the crystal floor is --glass-crystal-l (96), NOT a flat L100.
    "-crystal": compositeSurface(page, [
      {
        l: 96,
        c: 0,
        h,
        a: crysA,
      },
      solidify,
      gloss,
    ]),
    // The chakra BODY is translucent (--glass-chakra-a), so the page shows through it, and chakra bakes
    // the same wash + gloss stack crystal does. The wash is absent here only because jsdom leaves
    // --glass-tint-a at its 0 fallback.
    "-chakra": compositeSurface(page, [
      {
        l: dark ? 28 : 88,
        c: 0,
        h,
        a: dark ? 0.58 : 0.62,
      },
      solidify,
      gloss,
    ]),
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
   * 80 + 4, muted 72 + 4.
   *
   * LIGHT is now reach-limited on the body tier, and that is a real property of the floor rather than a
   * slack expectation: dark text on a light surface gets more contrast the lighter the surface is, and
   * dropping the opaque floor from L90.9 to L88 (tokens.css — near-white is where the sRGB chroma
   * ceiling collapses, so the old floor could not hold its own tint) took the ceiling with it. At L88
   * even pure black reaches only 82.8 Lc, so the 84 aim is unreachable and the solve saturates. That is
   * still above the bare 80 band target and well above the 75 body floor, which is what actually has to
   * hold — so this asserts reaching the aim OR saturating above the bare target, not a fixed number.
   */
  it("aims -opaque above the bare band target", async () => {
    await mount(dark);

    const s = surfaces(dark);
    const body = lcOn("--foreground-opaque", s["-opaque"]);
    /* Dark has the headroom and must hit the aim exactly; light saturates at its ceiling. Asserting the
       ceiling to 1dp keeps this honest — if the floor moves again the number moves and this test says so
       rather than passing on a loose ">= 80". */
    if (dark) expect(body).toBeCloseTo(84, 0);
    else expect(body).toBeCloseTo(82.8, 1);
    expect(body).toBeGreaterThan(80);

    // Muted aims 72 + 4 and stays reachable in both modes, so it is exact either way.
    expect(lcOn("--muted-foreground-opaque", s["-opaque"])).toBeCloseTo(76, 0);
  });
});

/**
 * TST-3-1 — the opaque floor's chroma CAP, exercised with a real chroma.
 *
 * engine.css paints that floor as `min(--glass-tint-c * --glass-opaque-c-scale, --glass-opaque-c-max)`,
 * because a jewel's tint chroma scaled up leaves the sRGB gamut at the floor's lightness, and WebKit
 * clips out-of-gamut oklch() per channel rather than reducing chroma — trading lightness away and
 * drifting hue. AutoForeground has to model the SAME clamp or it bands text against a surface more
 * colourful, and so slightly darker, than the one on screen. In production that mismatch reached 1.45x
 * on 10 of the 12 jewels.
 *
 * Everything above runs on jsdom fallbacks, where `--glass-tint-c` resolves to 0 — so `min(0 * s, cap)`
 * is 0 either way and the clamp is structurally unreachable. Those tests would pass with the cap deleted.
 * This one sets a real chroma inline and measures against the surface the CSS would actually paint.
 *
 * DARK on purpose: light saturates at pure black (the L88 ceiling is 82.8 Lc), and a saturated solve is
 * insensitive to the surface it was solved against — black is black whether or not the cap applied.
 */
describe("AutoForeground: opaque floor honours --glass-opaque-c-max", () => {
  const H = 255;
  const L = 36.4; // the dark opaque floor
  const SCALE = 1.05; // tokens.css, .dark
  const CAP = 0.12; // tokens.css, .dark
  const TINT_C = 0.3; // well past the cap: 0.3 * 1.05 = 0.315

  it("bands -opaque text against the CAPPED floor, not the raw scaled chroma", async () => {
    root().classList.add("dark");
    root().style.setProperty("--glass-tint-h", String(H));
    root().style.setProperty("--glass-tint-c", String(TINT_C));
    root().style.setProperty("--glass-opaque-l", String(L));
    root().style.setProperty("--glass-opaque-c-scale", String(SCALE));
    root().style.setProperty("--glass-opaque-c-max", String(CAP));

    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-opaque")).not.toBe(""));

    const capped: OklchColor = {
      l: L,
      c: Math.min(TINT_C * SCALE, CAP),
      h: H,
    };
    const uncapped: OklchColor = {
      l: L,
      c: TINT_C * SCALE,
      h: H,
    };

    /* The discriminator. The solver aims body 80 + LC_AIM_KNOWN 4 = 84 on whichever surface it modelled,
       so the emitted token reads ~84 against that one. Modelled capped -> 84.0 on `capped`; modelled
       uncapped -> 84.0 on `uncapped` and ~87.5 on `capped`. Measuring on `capped` — the surface the CSS
       paints — separates the two by ~3.5 Lc. */
    expect(lcOn("--foreground-opaque", capped)).toBeCloseTo(84, 0);
    expect(lcOn("--foreground-opaque", uncapped)).not.toBeCloseTo(84, 0);
  });

  it("leaves the floor alone when the scaled chroma is already under the cap", async () => {
    /* The clamp must not become a floor of its own: under the cap the raw product has to pass through,
       or every low-chroma preset would be pushed UP to the cap and moonstone would read as tan again. */
    const lowC = 0.05; // 0.05 * 1.05 = 0.0525, comfortably under 0.12
    root().classList.add("dark");
    root().style.setProperty("--glass-tint-h", String(H));
    root().style.setProperty("--glass-tint-c", String(lowC));
    root().style.setProperty("--glass-opaque-l", String(L));
    root().style.setProperty("--glass-opaque-c-scale", String(SCALE));
    root().style.setProperty("--glass-opaque-c-max", String(CAP));

    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-opaque")).not.toBe(""));

    expect(
      lcOn("--foreground-opaque", {
        l: L,
        c: lowC * SCALE,
        h: H,
      }),
    ).toBeCloseTo(84, 0);
  });
});
