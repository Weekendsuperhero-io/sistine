/**
 * Light-mode text must stay on the tonal palette instead of collapsing to #000.
 *
 * A light-mode ramp spans L0 → base, and sRGB has almost no gamut volume at the bottom: L0 renders
 * #000000 whatever chroma is requested, L5 → #030000, L10 → #070200. Those steps are pure black wearing
 * a theme colour's name.
 *
 * pickInBand reaches them two ways, and BOTH fire in light mode:
 *   - the band is out of range entirely (the `small` band floors at Lc 90; light surfaces top out around
 *     82–89), so it falls back to the whole ramp and takes maximum contrast;
 *   - the band is in range but its BOOSTED target sits above every step, so the closest-to-target step is
 *     again the darkest one.
 * Measured across the shipped presets before the fix: body text rendered black on 10 of 21, and
 * --foreground-strong on 20 of 21. Dark mode was never affected — its ramp runs L60 → L100, so it has no
 * steps down here at all.
 *
 * The surface-parity suite cannot see any of this: jsdom resolves --glass-tint-c to 0, which makes the
 * ramp base achromatic, and on a NEUTRAL theme black genuinely is the darkest tone. So these set a real
 * tint chroma inline, the way a preset does.
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

/** Below this an sRGB colour is black regardless of the chroma asked for — see TONAL_MIN_L. */
const READS_AS_BLACK = 16;
/** Above this an sRGB colour is white regardless of the chroma asked for — see TONAL_MAX_L. */
const READS_AS_WHITE = 98;

const TIERS = [
  "--foreground",
  "--foreground-strong",
  "--muted-foreground",
];

/** Mount carrying a real tint, as a preset does. */
async function mountTinted(hue: number) {
  root().style.setProperty("--glass-tint-h", String(hue));
  root().style.setProperty("--glass-tint-c", "0.09");
  root().style.setProperty("--glass-tint-a", "0.15");
  render(<AutoForeground />);
  await waitFor(() => expect(read("--foreground-strong")).not.toBe(""));
}

/**
 * Dark needs its SURFACE pinned, not just its tint. jsdom resolves the surface knobs to fallbacks that
 * land darker than anything the theme ships, and a darker surface hands out more contrast — so the small
 * band is satisfied early and the solve never approaches white, which is exactly the case under test.
 * These numbers put the surface at L41, alongside the real dark presets (L44.5), where the unclipped ramp
 * does reach for L100 and the clipped one answers L96.7 at 87 Lc.
 */
async function mountTintedDark(hue: number) {
  root().classList.add("dark");
  root().style.setProperty("--glass-tint-h", String(hue));
  root().style.setProperty("--glass-tint-c", "0.09");
  root().style.setProperty("--glass-tint-a", "0.2");
  root().style.setProperty("--glass-opaque-l", "44");
  root().style.setProperty("--glass-wash-l", "60");
  render(<AutoForeground />);
  await waitFor(() => expect(read("--foreground-strong")).not.toBe(""));
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

describe("AutoForeground: light-mode text keeps its hue", () => {
  it.each([
    [
      "blue",
      268,
    ],
    [
      "warm",
      75,
    ],
    [
      "green",
      145,
    ],
  ])("does not collapse any tier to black on a %s tint", async (_label, hue) => {
    await mountTinted(hue);

    for (const t of TIERS) {
      const c = fg(t);
      expect(c.l, `${t} is L${c.l.toFixed(1)} — reads as black rather than a theme colour`).toBeGreaterThan(READS_AS_BLACK);
    }
  });

  it("keeps chroma on the tier that used to go black", async () => {
    /* --foreground-strong is the worst case: its `small` band floors at Lc 90, unreachable on any light
       surface, so it took the ramp's extreme every time. Lightness alone is not the assertion — a step can
       be light and still washed out — so require real chroma too. */
    await mountTinted(268);

    const strong = fg("--foreground-strong");
    expect(strong.l).toBeGreaterThan(READS_AS_BLACK);
    expect(strong.c).toBeGreaterThan(0.01);
  });

  it("leaves NEUTRAL themes free to use black", async () => {
    /* Selenite has chroma 0: its ramp is a grey scale, where black is the darkest TONE rather than a
       colour that lost its hue. Clipping there would cap contrast for nothing. */
    root().style.setProperty("--glass-tint-h", "250");
    root().style.setProperty("--glass-tint-c", "0");
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-strong")).not.toBe(""));

    expect(fg("--foreground-strong").l).toBeLessThan(READS_AS_BLACK);
  });

  it.each([
    [
      "blue",
      268,
    ],
    [
      "warm",
      75,
    ],
    [
      "green",
      145,
    ],
  ])("does not collapse any tier to white in dark on a %s tint", async (_label, hue) => {
    /* The mirror case, and NOT symmetric with the black end. A dark ramp runs L60 → L100 and only its top
       point is exactly achromatic, but each 3-point step near white is worth 6–8 Lc where the whole L0–L18
       span near black is worth ~1.5. So the clip up here is tight, and the contrast it costs is real —
       taken deliberately so fine text carries the theme in both modes. */
    await mountTintedDark(hue);

    for (const t of TIERS) {
      const c = fg(t);
      expect(c.l, `${t} is L${c.l.toFixed(1)} — pure white rather than a theme colour`).toBeLessThan(READS_AS_WHITE);
    }
    expect(fg("--foreground-strong").c).toBeGreaterThan(0.005);
  });

  it("leaves a NEUTRAL dark theme achromatic", async () => {
    /* Chroma 0 → a grey scale, where black and white are the genuine ends rather than colours that lost
       their hue, so the clip is bypassed entirely. Whether the solver then HAPPENS to want L100 is a
       property of the band, not of the clip (here it picks L96.7 as the nearest in-band step), so the
       assertion is that no hue was invented — the bypass itself is pinned by the light-mode case above,
       where neutral is free to go all the way to black. */
    root().classList.add("dark");
    root().style.setProperty("--glass-tint-h", "250");
    root().style.setProperty("--glass-tint-c", "0");
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-strong")).not.toBe(""));

    expect(fg("--foreground-strong").c).toBe(0);
  });

  it("keeps every clipped pick above the body floor", async () => {
    /* The line the clip may never cross. Missing the `small` band's aspirational 90 is accepted — no light
       surface reaches it and in dark only pure white does — but nothing may drop under the readability
       floor to buy hue. */
    await mountTintedDark(268);
    for (const t of TIERS) expect(fg(t).l).toBeGreaterThan(60);
  });
});
