/**
 * TST-2-3 — `--glass-opacity` is a surface-model input, so changing it must re-band the text tiers.
 *
 * The solidify layer paints at `--glass-opacity` over every sheer material's background colour, so it
 * sets the floor each surface composites toward: at 0.7 a dark glass card sits near L31, at 0 it drops
 * to the bare veil floor. AutoForeground bands text against that floor, so the two need different
 * foregrounds — and the component-opacity slider writes the property INLINE with no `sistine-fg` event.
 *
 * That combination is the bug this pins. The style MutationObserver only re-bands when one of
 * `STYLE_INPUTS` actually changed (an old-vs-new gate that keeps tint drags on the event fast path and
 * stops our own `--foreground*` writes from re-triggering us). `--glass-opacity` was not in that list
 * while it was also not part of the surface model; it became one when the solidify floor did. Left out,
 * the tiers silently go stale exactly when the floor moves most — while a consumer dials solidity.
 *
 * A per-surface assertion cannot catch this: the stale tiers still satisfy their own band, they are
 * just banded against a surface that is no longer on screen. Only re-reading after a mutation does.
 */
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AutoForeground } from "@/components/auto-foreground";

const root = () => document.documentElement;
const read = (name: string) => root().style.getPropertyValue(name).trim();

/** The tier tokens that band against the solidify floor. */
const TIERS = [
  "--foreground",
  "--foreground-strong",
  "--foreground-muted",
];
const snapshot = () => TIERS.map(read).join(" | ");

/** Mount and wait for the first banding pass to emit tokens. */
async function mounted() {
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

describe("AutoForeground: --glass-opacity re-bands the tiers", () => {
  it("re-solves the tiers when the solidify opacity changes inline", async () => {
    root().classList.add("dark");
    await mounted();
    const before = snapshot();

    /* What the component-opacity slider does: an inline write, no `sistine-fg` event. Fully sheer moves
       the dark surface from ~L31 down to the bare veil floor — a different surface, so different text. */
    root().style.setProperty("--glass-opacity", "0");

    await waitFor(() => expect(snapshot()).not.toBe(before));
  });

  it("re-bands in light mode too, where the floor moves the other way", async () => {
    /* Light's solidify floor is near-white, so dropping opacity DARKENS the surface — the mirror of the
       dark case. Both directions matter: a one-sided guard passes on a model that only handles one. */
    await mounted();
    const before = snapshot();

    root().style.setProperty("--glass-opacity", "0");

    await waitFor(() => expect(snapshot()).not.toBe(before));
  });

  it("ignores inline writes that touch no surface-model input", async () => {
    /* The other half of the gate. If ANY style mutation re-banded, our own `--foreground*` writes would
       re-trigger the observer on every pass — an endless loop — and every tint drag would pay the
       getComputedStyle reflow the event fast path exists to avoid. */
    await mounted();
    const before = snapshot();

    root().style.setProperty("--not-a-surface-input", "1");
    await new Promise((r) => setTimeout(r, 30));

    expect(snapshot()).toBe(before);
  });
});
