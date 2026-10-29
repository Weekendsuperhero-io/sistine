import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutoForeground } from "@/components/auto-foreground";
import { apcaContrast, compositeSurface, LC_MARGIN, parseOklch } from "@/lib/oklch-utils";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("style");
  document.documentElement.className = "";
  localStorage.clear();
});

describe("Lustre tint-wash foregrounds", () => {
  for (const dark of [
    false,
    true,
  ]) {
    it(`bands text against the ${dark ? "deep night body" : "day body plus tint wash"}`, async () => {
      const root = document.documentElement;
      root.classList.toggle("dark", dark);
      root.style.setProperty("--glass-tint-h", "255");
      root.style.setProperty("--glass-tint-c", "0.09");
      root.style.setProperty("--glass-tint-a", "0.15");
      render(<AutoForeground />);
      await waitFor(() => expect(root.style.getPropertyValue("--foreground-lustre")).not.toBe(""));

      // Paint order from the material: backing, dense body, day pigment, then title-zone gloss.
      // A real chroma and alpha make an omitted wash observable through the emitted text contrast.
      const washA = dark ? 0 : 0.15;
      const surface = compositeSurface(
        {
          l: dark ? 20 : 95,
          c: 0,
          h: 255,
        },
        [
          {
            l: dark ? 36.4 : 92,
            c: Math.min(0.09 * (dark ? 0.98 : 0.85), dark ? 0.12 : 0.055 * 0.65),
            h: 255,
            a: 0.7,
          },
          {
            l: dark ? 22 : 93,
            c: dark ? 0.035 : 0.025,
            h: 255,
            a: 0.8,
          },
          {
            l: dark ? 58 : 72,
            c: 0.09 * 2.5,
            h: 255,
            a: washA,
          },
          {
            l: dark ? 68 : 97,
            c: dark ? 0.1 : 0.013,
            h: 255,
            a: 0.21,
          },
        ],
      );
      const ink = parseOklch(root.style.getPropertyValue("--foreground-lustre"));
      expect(ink).not.toBeNull();
      const target = 80 + LC_MARGIN * 0.2 * (1 - washA) * 0.79 * 0.3;
      expect(Math.abs(apcaContrast(ink!, surface))).toBeCloseTo(target, 1);
    });
  }
});
