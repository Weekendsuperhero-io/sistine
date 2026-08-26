/**
 * The ADAPTIVE tiers must keep their hue too, not just the ramp-drawn ones.
 *
 * `--foreground-opaque` / `-crystal` / `-chakra` are solved by readableForeground rather than picked from
 * the tonal ramp, because those floors can need a polarity the ramp does not span (a LIGHT opaque card on
 * a dark page needs DARK text; the ramp only runs white→base in dark mode).
 *
 * readableForeground aims at the band target and, when the target sits beyond what the surface can give,
 * returns the most contrast AVAILABLE — which is the lightness extreme, exactly where sRGB has no gamut
 * volume and the requested chroma is annihilated. In light mode that is not an edge case, it is the
 * default: an L88 opaque floor tops out at 81.1–84.3 Lc while the opaque tiers aim at target +
 * LC_AIM_KNOWN, so the aim is unreachable and every jewel's --foreground-opaque solved to pure #000000.
 *
 * The fix mirrors the tonal ramp clip (TONAL_MIN_L / TONAL_MAX_L) with the same legibility guard: give up
 * the ~1 Lc that the last few points of lightness are worth, and keep the hue.
 *
 * These assert on CHROMA, not lightness. A tier that is merely dark is fine — the failure mode is a tier
 * that has lost its colour entirely, and only chroma distinguishes those two.
 */
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AutoForeground } from "@/components/auto-foreground";
import { type OklchColor, parseOklch } from "@/lib/oklch-utils";

const root = () => document.documentElement;
const read = (name: string) => root().style.getPropertyValue(name).trim();
const fg = (name: string): OklchColor => {
  const c = parseOklch(read(name));
  if (!c) throw new Error(`${name} is not oklch: ${read(name) || "(empty)"}`);
  return c;
};

/** The three tier sets solved by readableForeground rather than the ramp. */
const ADAPTIVE = [
  "-opaque",
  "-crystal",
  "-chakra",
];

/** Mount carrying a real tint, as a preset does. jsdom resolves --glass-tint-c to 0 otherwise. */
async function mountTinted(hue: number, dark = false) {
  if (dark) root().classList.add("dark");
  root().style.setProperty("--glass-tint-h", String(hue));
  root().style.setProperty("--glass-tint-c", "0.09");
  root().style.setProperty("--glass-tint-a", "0.15");
  render(<AutoForeground />);
  await waitFor(() => expect(read("--foreground-opaque")).not.toBe(""));
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

describe("AutoForeground: adaptive tiers keep their hue", () => {
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
  ])("never collapses an adaptive tier to black on a %s tint", async (_label, hue) => {
    await mountTinted(hue);

    for (const suffix of ADAPTIVE) {
      const c = fg(`--foreground${suffix}`);
      expect(c.c, `--foreground${suffix} is ${read(`--foreground${suffix}`)} — chroma annihilated`).toBeGreaterThan(0.01);
      expect(c.l, `--foreground${suffix} is L${c.l.toFixed(1)} — below the tonal clip`).toBeGreaterThanOrEqual(18);
    }
  });

  it("holds the clip across every adaptive tier, not just the body one", async () => {
    /* The size tiers and the icon tier solve separately (tierAtHue / --foreground-ui). The `small` band
       floors at Lc 90, which NO light surface reaches, so those are the most reach-limited of the set and
       the likeliest to pin to the extreme. */
    await mountTinted(268);

    for (const suffix of ADAPTIVE) {
      for (const tier of [
        "--muted-foreground",
        "--foreground-soft",
        "--foreground-strong",
        "--foreground-ui",
      ]) {
        /* Lightness AND chroma. Chroma alone is too loose to discriminate here: clampToGamut still
           returns a sliver of it at L≈0, enough to clear a bare `> 0.005` while the colour is black to
           the eye. The clip bound is what actually pins the behaviour. */
        const c = fg(`${tier}${suffix}`);
        expect(c.l, `${tier}${suffix} is L${c.l.toFixed(1)} — below the tonal clip`).toBeGreaterThanOrEqual(18);
        expect(c.c, `${tier}${suffix} lost its chroma`).toBeGreaterThan(0.005);
      }
    }
  });

  it("leaves NEUTRAL themes free to reach the extremes", async () => {
    /* Chroma 0 is a grey scale, where black and white are the genuine ends of the ramp rather than
       colours that lost their hue — the same exemption the tonal ramp clip makes. Asserting the bypass
       exists at all: a blanket clamp would have pinned these to L18 too. */
    root().style.setProperty("--glass-tint-h", "250");
    root().style.setProperty("--glass-tint-c", "0");
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-opaque")).not.toBe(""));

    for (const suffix of ADAPTIVE) {
      expect(fg(`--foreground${suffix}`).c, `neutral --foreground${suffix} invented a hue`).toBe(0);
    }
  });

  it("leaves the DARK solves alone — they already land inside the clip", async () => {
    /* Dark opaque solves to L92–93 against an L36.4 floor, comfortably inside TONAL_MAX_L, so the clip
       must be a no-op there. This is the control: if it ever starts biting in dark, the bounds are wrong
       rather than the surfaces. */
    await mountTinted(268, true);

    for (const suffix of ADAPTIVE) {
      const c = fg(`--foreground${suffix}`);
      expect(c.l, `--foreground${suffix} is L${c.l.toFixed(1)}`).toBeLessThanOrEqual(97);
      expect(c.c).toBeGreaterThan(0.005);
    }
  });
});
