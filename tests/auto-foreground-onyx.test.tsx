import { readFileSync } from "node:fs";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutoForeground, FG_EVENT } from "@/components/auto-foreground";
import { ForegroundTester } from "@/components/foreground-tester";
import { apcaContrast, parseOklch } from "@/lib/oklch-utils";

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
