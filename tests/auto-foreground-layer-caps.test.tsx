/**
 * TST-1-2 — the per-layer chroma CAPS in the crystal / chakra stacks, exercised with a real tint.
 *
 * Each sheer layer clamps the theme's chroma by a different formula over the same `--glass-tint-c`, and
 * they are easy to conflate:
 *   - crystal floor  `--glass-tint-c-hi × 0.6`  — the NEAR-WHITE budget, min(tint-c, 0.017)
 *   - gloss ink      `min(tint-c × --glass-gloss-tint, --glass-gloss-c-max)`  — multiply THEN cap
 *   - chakra body    `min(tint-c, --glass-chakra-c-max)`  — cap the raw chroma, no multiplier
 *   - solidify floor `min(tint-c × --glass-opaque-c-scale, --glass-solidify-c-max)` — scale THEN cap
 * The surface-parity suite cannot see any of them: it asserts Lc SPREAD across surfaces, and a cap
 * regression moves every surface together by far less than that threshold.
 *
 * What each cap is actually worth on the composited surface (measured, tint-c 0.09, light):
 *   gloss    capped 0.013 vs uncapped 0.3825  →  L90.50 → L87.03, chroma 0.0425 → 0.0794   (large)
 *   crystal  capped 0.0102 vs uncapped 0.054  →  L90.50 → L90.46                          (diluted)
 *   chakra   capped 0.055  vs uncapped 0.09   →  L89.57 → L89.47                          (diluted)
 *
 * So the gloss cap is behaviourally observable and the other two are not — the 70%-opaque solidify layer
 * above them leaves only ~6% of their chroma in the mix. These pin the gloss cap through the emitted
 * token, and pin the other two at `--glass-opacity: 0`, where the solidify layer is absent and their
 * contribution is at its largest. That second pair is a model-fidelity assertion, not a perceptual one;
 * saying so here is better than a tolerance loose enough to pass either way.
 */
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AutoForeground } from "@/components/auto-foreground";
import { apcaContrast, compositeSurface, type OklchColor, parseOklch } from "@/lib/oklch-utils";

const root = () => document.documentElement;
const read = (name: string) => root().style.getPropertyValue(name).trim();
const fg = (name: string): OklchColor => {
  const c = parseOklch(read(name));
  if (!c) throw new Error(`${name} is not oklch: ${read(name) || "(empty)"}`);
  return c;
};
const lcOn = (token: string, surface: OklchColor) => Math.abs(apcaContrast(fg(token), surface));

const H = 255;
const TINT_C = 0.09; // exceeds every light cap, so all four bind
const TINT_A = 0.15;

/** The correctly-capped light stacks, mirroring engine.css / tokens.css. */
const stacks = (opacity: number) => {
  const page = {
    l: 95,
    c: 0,
    h: H,
  };
  const solidify = {
    l: 92,
    c: Math.min(TINT_C * 0.85, 0.055 * 0.65),
    h: H,
    a: opacity,
  };
  const wash = {
    l: 72,
    c: TINT_C * 2.5,
    h: H,
    a: TINT_A,
  };
  const gloss = {
    l: 97,
    c: Math.min(TINT_C * 4.25, 0.013),
    h: H,
    a: 0.2,
  };
  return {
    crystal: compositeSurface(page, [
      {
        l: 96,
        c: Math.min(TINT_C, 0.017) * 0.6,
        h: H,
        a: 0.3,
      },
      solidify,
      wash,
      gloss,
    ]),
    chakra: compositeSurface(page, [
      {
        l: 88,
        c: Math.min(TINT_C, 0.055),
        h: H,
        a: 0.62,
      },
      solidify,
      wash,
      gloss,
    ]),
  };
};

async function mount(opacity?: number) {
  root().style.setProperty("--glass-tint-h", String(H));
  root().style.setProperty("--glass-tint-c", String(TINT_C));
  root().style.setProperty("--glass-tint-a", String(TINT_A));
  if (opacity !== undefined) root().style.setProperty("--glass-opacity", String(opacity));
  render(<AutoForeground />);
  await waitFor(() => expect(read("--foreground-crystal")).not.toBe(""));
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

/* The band aim each adaptive tier solves for: the body target lifted by the show-through margin
   (LC_MARGIN × the backdrop's surviving weight). Asserting the emitted ink hits THIS on the correctly-
   capped mirror is what makes the test discriminating — it is a statement that the component modelled the
   same surface this file does. A wrong cap gives a different surface, so the ink lands off its aim when
   measured here, with no magic constant to keep in step. */
const LC_MARGIN = 12;
const aim = (surviving: number) => Math.min(80 + LC_MARGIN * surviving, 90);
const crystalAim = (opacity: number) => aim((1 - 0.3) * (1 - TINT_A) * (1 - 0.2) * (1 - opacity));
const chakraAim = (opacity: number) => aim((1 - 0.62) * (1 - TINT_A) * (1 - 0.2) * (1 - opacity));

describe("AutoForeground: sheer-layer chroma caps", () => {
  it("caps the GLOSS ink at --glass-gloss-c-max, not tint-c × --glass-gloss-tint", async () => {
    /* The cap that matters: 0.09 × 4.25 = 0.3825 asked against a 0.013 ceiling, so leaving it off makes
       the gloss ~29× too colourful and drags the crystal surface 3.5 L darker. Banding against that wrong
       surface moves the emitted ink far past this tolerance. */
    await mount();
    const s = stacks(0.7);
    expect(lcOn("--foreground-crystal", s.crystal), "crystal ink is off its aim — the gloss cap moved").toBeCloseTo(crystalAim(0.7), 1);
    expect(lcOn("--foreground-chakra", s.chakra), "chakra ink is off its aim — the gloss cap moved").toBeCloseTo(chakraAim(0.7), 1);
  });

  it("caps the crystal floor at --glass-tint-c-hi and the chakra body at --glass-chakra-c-max", async () => {
    /* Pinned with the solidify layer OFF (--glass-opacity: 0, the documented sheer default), where these
       two caps are no longer diluted to ~6% of their value by a 70%-opaque layer painted over them. Even
       here the margin is thin — this is a model-fidelity pin, not a perceptual one. */
    await mount(0);
    const s = stacks(0);
    expect(lcOn("--foreground-crystal", s.crystal), "crystal ink is off its aim — the --glass-tint-c-hi cap moved").toBeCloseTo(crystalAim(0), 1);
    expect(lcOn("--foreground-chakra", s.chakra), "chakra ink is off its aim — the --glass-chakra-c-max cap moved").toBeCloseTo(chakraAim(0), 1);
  });
});
