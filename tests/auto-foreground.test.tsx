/**
 * TST-1-2 — AutoForeground's chakra tier set and the mode-aware gloss fallback.
 *
 * AutoForeground solves a foreground per SURFACE, not per page: the normal glass floor, then `-opaque`,
 * `-crystal`, and now `-chakra`. Each material's page style / [data-material] block remaps the text
 * tokens to its own suffixed set, so a missing set means that material silently falls back to the
 * page foreground — banded for a different floor.
 *
 * jsdom resolves no stylesheets, so `getComputedStyle` returns "" for every custom property and every
 * `num(name, fallback)` takes its fallback. That is exactly what makes the FALLBACKS testable here,
 * and inline styles on <html> are how a specific input gets driven.
 */
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AutoForeground } from "@/components/auto-foreground";

const root = () => document.documentElement;
const read = (name: string) => root().style.getPropertyValue(name).trim();

/** Lightness out of an `oklch(L% C H)` string — the channel contrast actually responds to. */
const lightnessOf = (v: string) => {
  const m = /^oklch\(\s*([\d.]+)%/.exec(v);
  if (!m) throw new Error(`not an oklch() value: ${v || "(empty)"}`);
  return Number.parseFloat(m[1]);
};

const TIERS = [
  "--foreground",
  "--muted-foreground",
  "--foreground-soft",
  "--foreground-strong",
  "--foreground-ui",
];

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

describe("AutoForeground: chakra tiers", () => {
  it("emits a full -chakra set alongside the other materials", async () => {
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-chakra")).not.toBe(""));

    for (const t of TIERS) {
      expect(read(`${t}-chakra`), `${t}-chakra`).toMatch(/^oklch\(/);
    }
  });

  it("emits -chakra in both schemes", async () => {
    root().classList.add("dark");
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-chakra")).not.toBe(""));

    for (const t of TIERS) {
      expect(read(`${t}-chakra`), `${t}-chakra (dark)`).toMatch(/^oklch\(/);
    }
  });

  it("solves chakra as its own surface, not a copy of the page foreground", async () => {
    /* The chakra body is L88 light / L28 dark — nowhere near the glass floor the normal tiers are
       banded against. Identical output would mean the tier never ran and the material is inheriting
       a foreground solved for a different surface. */
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-chakra")).not.toBe(""));
    expect(read("--foreground-chakra")).not.toBe(read("--foreground"));
  });

  it("flips chakra text direction between a light and a dark body", async () => {
    /* `adaptive` exists for exactly this: an L88 body needs DARK text, an L28 body needs LIGHT text,
       and the theme ramp only spans the readable half so it cannot produce both. */
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-chakra")).not.toBe(""));
    const lightBody = lightnessOf(read("--foreground-chakra"));

    root().removeAttribute("style");
    root().classList.add("dark");
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-chakra")).not.toBe(""));
    const darkBody = lightnessOf(read("--foreground-chakra"));

    expect(lightBody).toBeLessThan(50); // dark ink on the L88 body
    expect(darkBody).toBeGreaterThan(50); // light ink on the L28 body
  });

  /** Solve --foreground-chakra with an arbitrary set of root vars pinned. */
  const chakraWith = async (vars: Record<string, string>) => {
    root().removeAttribute("style");
    for (const [k, v] of Object.entries(vars)) root().style.setProperty(k, v);
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-chakra")).not.toBe(""));
    return lightnessOf(read("--foreground-chakra"));
  };

  it("tracks --glass-chakra-l rather than assuming the default body", async () => {
    /* The banding lightness is read from the token, but it is only ONE layer of the chakra stack: the
       body is translucent (--glass-chakra-a) AND the solidify floor paints OVER it at --glass-opacity,
       so at shipped defaults the token carries just 13% of its nominal authority (a full L88 → L12
       sweep moves the composited surface only L90.5 → L80.8). Both ends stay light-side of the ~L70
       polarity crossover, so the text stays DARK and gets darker — it does not flip. Assert the
       direction it actually has: a darker body means less reach for dark ink, so the pick goes down. */
    const onLightBody = await chakraWith({
      "--glass-chakra-l": "88",
    });
    const onDarkBody = await chakraWith({
      "--glass-chakra-l": "12",
    });

    expect(onLightBody).toBeGreaterThan(onDarkBody);
    expect(onLightBody - onDarkBody).toBeGreaterThan(5); // the token must MOVE the solve, not be ignored
  });

  it("lets --glass-chakra-l flip the text once the layers above it are out of the way", async () => {
    /* The polarity flip the token can't reach on its own. Drop the solidify floor (--glass-opacity: 0)
       and make the body opaque, and --glass-chakra-l drives 75% of the surface — enough to cross the
       crossover, at which point `adaptive` must switch the ink to light. This pins that the chakra tier
       is genuinely banding against its own composited surface rather than a fixed assumption. */
    const solo = {
      "--glass-opacity": "0",
      "--glass-chakra-a": "1",
    };
    const onLightBody = await chakraWith({
      ...solo,
      "--glass-chakra-l": "88",
    });
    const onDarkBody = await chakraWith({
      ...solo,
      "--glass-chakra-l": "12",
    });

    expect(onLightBody).toBeLessThan(50); // dark ink on the L88 body
    expect(onDarkBody).toBeGreaterThan(50); // light ink once the body actually goes dark
  });
});

describe("AutoForeground: mode-aware gloss fallback", () => {
  /** Solve `--foreground-crystal` from a clean root, optionally pinning the gloss token first. */
  const crystalWith = async (glossL: string | null, dark: boolean) => {
    cleanup();
    root().removeAttribute("style");
    root().className = dark ? "dark" : "";
    if (glossL !== null) root().style.setProperty("--glass-gloss-l", glossL);
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-crystal")).not.toBe(""));
    return read("--foreground-crystal");
  };

  it("falls back to 97 in light mode, not 66", async () => {
    /* The regression this guards: a single hardcoded 66 modelled the LIGHT crystal surface ~6 L
       darker than it renders, banding its text too weak.

       Comparing the two SCHEMES is not enough to catch that — they differ anyway (baseL 20 vs 95,
       and the ramp runs the other way), so that assertion passes with the bug present. Pinning the
       token to each candidate and comparing against the unset solve is what actually identifies
       which number the fallback used. */
    const unset = await crystalWith(null, false);
    expect(unset).toBe(await crystalWith("97", false));
    expect(unset).not.toBe(await crystalWith("66", false));
  });

  it("falls back to 66 in dark mode, not 97", async () => {
    const unset = await crystalWith(null, true);
    expect(unset).toBe(await crystalWith("66", true));
    expect(unset).not.toBe(await crystalWith("97", true));
  });

  it("uses a set --glass-gloss-l in place of the fallback", async () => {
    /* Pinning the token to the OTHER mode's value has to change the light-mode solve, which proves
       the fallback is a fallback and not a constant. */
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-crystal")).not.toBe(""));
    const viaFallback = read("--foreground-crystal");

    root().removeAttribute("style");
    root().style.setProperty("--glass-gloss-l", "66");
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-crystal")).not.toBe(""));

    expect(read("--foreground-crystal")).not.toBe(viaFallback);
  });

  it("still emits the opaque and crystal sets", async () => {
    /* Chakra was added as a fourth applyTiers call; the three that already existed must survive it. */
    render(<AutoForeground />);
    await waitFor(() => expect(read("--foreground-chakra")).not.toBe(""));

    for (const suffix of [
      "",
      "-opaque",
      "-crystal",
      "-chakra",
    ]) {
      expect(read(`--foreground${suffix}`), `--foreground${suffix}`).toMatch(/^oklch\(/);
    }
  });
});
