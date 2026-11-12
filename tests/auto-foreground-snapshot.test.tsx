/**
 * AutoForeground's reads (components/auto-foreground.tsx). A read of <html>'s computed style makes the
 * browser restyle the page there and then, which on a theme pick is every element, and the foregrounds it
 * writes restyle it again. So a COMPLETE snapshot (readFgInputs) bands without a read and covers the
 * attribute changes it was sent with, and the observer does not read again what the event's own read
 * covered. Banding is unchanged: a complete snapshot is the DOM's own numbers, and a partial one (the
 * switcher's drag snapshot) is still checked against the DOM.
 */
import { readFileSync } from "node:fs";
import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoForeground, FG_EVENT, FG_INPUTS, readFgInputs } from "@/components/auto-foreground";
import { fgSnapshot } from "@/components/glass-tint-switcher";
import { GLASS_TINT_PRESETS } from "@/lib/glass-presets";
import { themeTokenCss } from "./theme-cascade";

const root = () => document.documentElement;
const TIERS = [
  "--foreground",
  "--foreground-opaque",
  "--foreground-crystal",
  "--foreground-chakra",
  "--foreground-lustre",
];
const tiers = () =>
  Object.fromEntries(
    TIERS.map((t) => [
      t,
      root().style.getPropertyValue(t).trim(),
    ]),
  );
const microtasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const send = (detail?: unknown) =>
  window.dispatchEvent(
    detail === undefined
      ? new Event(FG_EVENT)
      : new CustomEvent(FG_EVENT, {
          detail,
        }),
  );

let style: HTMLStyleElement | undefined;
function mount(preset: string, dark: boolean) {
  style = document.createElement("style");
  style.textContent = themeTokenCss();
  document.head.append(style);
  root().dataset.glassTint = preset;
  root().classList.toggle("dark", dark);
  render(<AutoForeground />);
}
afterEach(() => {
  vi.restoreAllMocks();
  style?.remove();
  style = undefined;
  root().removeAttribute("style");
  root().className = "";
  delete root().dataset.glassTint;
  delete root().dataset.gloss;
});

describe("AutoForeground's inputs", () => {
  it("FG_INPUTS is every number the solve reads", () => {
    const source = readFileSync("components/auto-foreground.tsx", "utf8");
    const read = new Set(
      [
        ...source.matchAll(/\bnum\("(--[a-z0-9-]+)"/g),
      ].map((m) => m[1]),
    );
    expect(
      [
        ...FG_INPUTS,
      ].sort(),
    ).toEqual(
      [
        ...read,
      ].sort(),
    );
  });
});

describe("a complete snapshot bands exactly as a DOM read", () => {
  for (const p of GLASS_TINT_PRESETS)
    for (const dark of [
      false,
      true,
    ])
      it(`${p.value} ${dark ? "night" : "day"}`, async () => {
        mount(p.value, dark);
        await waitFor(() => expect(tiers()["--foreground-opaque"]).not.toBe(""));
        const dom = tiers();
        const snapshot = readFgInputs();
        for (const t of TIERS) root().style.removeProperty(t);
        send(snapshot);
        expect(tiers()).toEqual(dom);
      });
});

describe("reads", () => {
  it("reads once for a pick: the observer does not read again what the event's read covered", async () => {
    mount("sapphire", false);
    await waitFor(() => expect(tiers()["--foreground-opaque"]).not.toBe(""));
    const day = tiers();
    const reads = vi.spyOn(window, "getComputedStyle");
    root().dataset.glassTint = "amethyst";
    root().classList.add("dark");
    root().dataset.gloss = "white";
    send();
    expect(reads).toHaveBeenCalledTimes(1);
    expect(tiers()).not.toEqual(day);
    await microtasks();
    expect(reads).toHaveBeenCalledTimes(1);
  });

  it("still reads a change no event came with (a mode toggle)", async () => {
    mount("sapphire", false);
    await waitFor(() => expect(tiers()["--foreground-opaque"]).not.toBe(""));
    const day = tiers();
    const reads = vi.spyOn(window, "getComputedStyle");
    root().classList.add("dark");
    await microtasks();
    expect(reads).toHaveBeenCalledTimes(1);
    expect(tiers()).not.toEqual(day);
  });

  it("does not read at all for a pick that carries a complete snapshot", async () => {
    mount("sapphire", false);
    await waitFor(() => expect(tiers()["--foreground-opaque"]).not.toBe(""));
    root().dataset.glassTint = "aventurine";
    root().classList.add("dark");
    const snapshot = readFgInputs();
    root().dataset.glassTint = "sapphire";
    root().classList.remove("dark");
    await microtasks();
    const reads = vi.spyOn(window, "getComputedStyle");
    root().dataset.glassTint = "aventurine";
    root().classList.add("dark");
    send(snapshot);
    const banded = tiers();
    await microtasks();
    expect(reads).not.toHaveBeenCalled();
    // and it is what a read of the same state bands
    send();
    expect(reads).toHaveBeenCalledTimes(1);
    expect(tiers()).toEqual(banded);
  });

  it("still checks a partial snapshot against the DOM", async () => {
    // Aventurine pins its own opaque cap (presets.css), which the switcher's snapshot does not carry.
    mount("aventurine", false);
    await waitFor(() => expect(tiers()["--foreground-opaque"]).not.toBe(""));
    const dom = tiers();
    root().dataset.glassTint = "sapphire";
    await microtasks();
    root().dataset.glassTint = "aventurine";
    const p = GLASS_TINT_PRESETS.find((x) => x.value === "aventurine");
    send(
      fgSnapshot({
        h: p!.h,
        c: p!.c,
        a: p!.a,
        base: "aventurine",
        l: 93,
        accOn: false,
        accH: 0,
        accC: 0.15,
      }),
    );
    expect(tiers()).not.toEqual(dom);
    await microtasks();
    expect(tiers()).toEqual(dom);
  });
});
