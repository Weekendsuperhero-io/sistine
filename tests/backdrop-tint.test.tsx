/**
 * The canvas backdrop derives ONE number from the theme — a hue — and paints it at a hardcoded chroma
 * of 0.15. That is fine for the jewels, whose hue is the whole point, and wrong for the two HUE-LESS
 * stones: selenite declares chroma 0 and moonstone a near-neutral 0.047 cream, so their
 * `--glass-tint-h` (250 and 75) is a placeholder rather than a colour. Taken straight, moonstone
 * painted the same saturated gold as the amber JEWEL.
 *
 * The rest of the system already handles this by anchoring those two themes' harmony wheel at 0°
 * instead of warping the near-neutral hue; useBackdropTint now applies the same rule. These tests pin
 * the seam, because nothing else would catch it: the wrong behaviour renders perfectly happily, it
 * just renders the wrong theme's colour.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useBackdropTint } from "@/lib/canvas-background-utils";

const root = () => document.documentElement;

/** Custom properties set inline are what jsdom's getComputedStyle can actually resolve. */
function setTheme(vars: Record<string, string | null>, preset?: string) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === null) root().style.removeProperty(k);
    else root().style.setProperty(k, v);
  }
  if (preset) root().dataset.glassTint = preset;
  else delete root().dataset.glassTint;
}

afterEach(() => {
  root().removeAttribute("style");
  delete root().dataset.glassTint;
});

describe("useBackdropTint hue resolution", () => {
  it("keeps a jewel's own hue", async () => {
    setTheme({
      "--glass-tint-h": "255",
      "--glass-tint-c": "0.07",
    });
    const { result } = renderHook(() => useBackdropTint());
    await waitFor(() => expect(result.current.hue).toBe(255));
  });

  it("ignores selenite's placeholder hue (chroma 0) and uses the canvas default", async () => {
    setTheme({
      "--glass-tint-h": "250",
      "--glass-tint-c": "0",
      "--harmony-h": "0",
    });
    const { result } = renderHook(() => useBackdropTint());
    await waitFor(() => expect(result.current.hue).toBe(250));
  });

  it("ignores moonstone's placeholder hue so it stops painting the amber jewel's gold", async () => {
    // The real divergence: h75 c0.047 is a cream stone, but h75 at the canvas's 0.15 chroma is gold —
    // byte-identical to the amber preset. --harmony-h: 0 is the hue-less signal, from CSS or switcher.
    setTheme(
      {
        "--glass-tint-h": "75",
        "--glass-tint-c": "0.047",
        "--harmony-h": "0",
      },
      "moonstone",
    );
    const { result } = renderHook(() => useBackdropTint());
    await waitFor(() => expect(result.current.hue).toBe(250));
  });

  it("resolves both hue-less stones to the SAME hue: the point of the change", async () => {
    setTheme({
      "--glass-tint-h": "250",
      "--glass-tint-c": "0",
      "--harmony-h": "0",
    });
    const selenite = renderHook(() => useBackdropTint());
    await waitFor(() => expect(selenite.result.current.hue).toBeDefined());
    const seleniteHue = selenite.result.current.hue;

    setTheme(
      {
        "--glass-tint-h": "75",
        "--glass-tint-c": "0.047",
        "--harmony-h": "0",
      },
      "moonstone",
    );
    const moonstone = renderHook(() => useBackdropTint());
    await waitFor(() => expect(moonstone.result.current.hue).toBe(seleniteHue));
  });

  it("still lets an explicit accent outrank the hue-less fallback", async () => {
    // Turning the accent knob on is a deliberate choice and must win over every default.
    setTheme(
      {
        "--glass-tint-h": "75",
        "--glass-tint-c": "0.047",
        "--harmony-h": "0",
        "--accent-h": "310",
      },
      "moonstone",
    );
    const { result } = renderHook(() => useBackdropTint());
    await waitFor(() => expect(result.current.hue).toBe(310));
  });

  it("treats a hand-rolled chroma-0 theme as hue-less even with no --harmony-h", async () => {
    setTheme({
      "--glass-tint-h": "128",
      "--glass-tint-c": "0",
    });
    const { result } = renderHook(() => useBackdropTint());
    await waitFor(() => expect(result.current.hue).toBe(250));
  });
});
