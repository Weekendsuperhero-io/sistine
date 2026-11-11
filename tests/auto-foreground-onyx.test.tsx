import { readFileSync } from "node:fs";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutoForeground, FG_EVENT } from "@/components/auto-foreground";
import { ForegroundTester } from "@/components/foreground-tester";
import { apcaContrast, compositeSurface, parseOklch } from "@/lib/oklch-utils";
import { colorOf, html, themeTokenCss } from "./theme-cascade";

// Read the shipped preset, rather than replacing its floor numbers with a parallel test fixture.
const presets = readFileSync("app/theme/presets.css", "utf8");
const onyxRule = presets.match(/\[data-glass-tint="onyx"\]\s*\{[^}]+\}/)?.[0];
if (!onyxRule) throw new Error("Onyx's CSS preset is missing");
let style: HTMLStyleElement;

afterEach(() => {
  cleanup();
  style?.remove();
  document.documentElement.removeAttribute("style");
  document.documentElement.className = "";
  delete document.documentElement.dataset.glassTint;
  delete document.documentElement.dataset.gloss;
  localStorage.clear();
});

describe("Onyx foregrounds", () => {
  it("keeps the foreground playground on the readable half of Onyx's ramp", async () => {
    style = document.createElement("style");
    style.textContent = onyxRule;
    document.head.append(style);
    document.documentElement.dataset.glassTint = "onyx";
    document.documentElement.className = "light";
    render(<ForegroundTester />);
    await waitFor(() => {
      const heading = screen.getByText("Large heading");
      expect(parseOklch(heading.style.color)?.l).toBeGreaterThan(70);
    });
  });
  for (const dark of [
    false,
    true,
  ]) {
    it(`keeps light, neutral text with the real ${dark ? "dark" : "light"}-mode CSS inputs`, async () => {
      style = document.createElement("style");
      style.textContent = onyxRule;
      document.head.append(style);
      const root = document.documentElement;
      root.dataset.glassTint = "onyx";
      root.classList.toggle("dark", dark);
      render(<AutoForeground />);
      for (const suffix of [
        "",
        "-opaque",
        "-crystal",
        "-chakra",
        "-lustre",
      ]) {
        await waitFor(() => expect(root.style.getPropertyValue(`--foreground${suffix}`)).not.toBe(""));
        const ink = parseOklch(root.style.getPropertyValue(`--foreground${suffix}`));
        expect(ink).not.toBeNull();
        expect(ink!.l).toBeGreaterThan(75);
        expect(ink!.c).toBe(0);
        expect(
          Math.abs(
            apcaContrast(ink!, {
              l: 25,
              c: 0,
              h: 250,
            }),
          ),
        ).toBeGreaterThanOrEqual(75);
      }
      // Stale drag snapshots from another palette must not replace Onyx's CSS-only dark floors.
      window.dispatchEvent(
        new CustomEvent(FG_EVENT, {
          detail: {
            "--glass-tint-c": 0.2,
            "--glass-opaque-l": 95,
          },
        }),
      );
      expect(parseOklch(root.style.getPropertyValue("--foreground"))!.l).toBeGreaterThan(75);
      const tonal = root.style.getPropertyValue("--foreground-lustre");
      root.dataset.gloss = "white";
      await waitFor(() => expect(root.style.getPropertyValue("--foreground-lustre")).not.toBe(tonal));
      expect(parseOklch(root.style.getPropertyValue("--foreground-lustre"))!.l).toBeGreaterThan(75);
    });
  }
});

/**
 * Onyx at NIGHT keeps its own wash. Deep night paints every wash at the DARKER of its own lightness and the
 * night depth (35), and Onyx's is already 16, so it must stay 16 — in the CSS and in AutoForeground's
 * model. Replacing the min with the depth outright would lift Onyx's night wash to 35 (and its day wash to
 * 100); this pins both halves, with the shipped tokens cascaded by jsdom.
 */
describe("Onyx at night (deep night)", () => {
  it("keeps Onyx's L16 wash at night, in the CSS and in the model", async () => {
    const night = html(true, "onyx");
    const wash = colorOf("--glass-tint-wash", night);
    expect(wash.l).toBeCloseTo(16, 6);
    const card = (washL: number) =>
      compositeSurface(colorOf("--glass-opaque-bg", night), [
        {
          ...wash,
          l: washL,
        },
      ]);

    style = document.createElement("style");
    style.textContent = themeTokenCss();
    document.head.append(style);
    const root = document.documentElement;
    root.dataset.glassTint = "onyx";
    root.classList.add("dark");
    render(<AutoForeground />);
    await waitFor(() => expect(root.style.getPropertyValue("--foreground-opaque")).not.toBe(""));
    const ink = parseOklch(root.style.getPropertyValue("--foreground-opaque"))!;
    /* The opaque tier aims 84 Lc on the card it modelled: the L16 one, not the L35 one the depth alone
       would give. */
    expect(Math.abs(apcaContrast(ink, card(16)))).toBeCloseTo(84, 0);
    expect(Math.abs(apcaContrast(ink, card(35)))).not.toBeCloseTo(84, 0);
  });
});
