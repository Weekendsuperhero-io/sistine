import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrystalGlossDemo } from "@/components/crystal-gloss-demo";
import { OklchRampDemo } from "@/components/oklch-ramp-demo";
import { parseOklch } from "@/lib/oklch-utils";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
  }),
}));

const root = () => document.documentElement;
const lightness = (element: HTMLElement) => parseOklch(element.style.color)?.l ?? -1;

beforeEach(() => {
  localStorage.clear();
  root().className = "light";
  root().dataset.glassTint = "amethyst";
  root().style.setProperty("--glass-tint-h", "300");
  root().style.setProperty("--glass-tint-c", "0.101");
  root().style.setProperty("--glass-tint-a", "0.15");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  root().className = "";
  root().removeAttribute("style");
  delete root().dataset.glassTint;
  delete root().dataset.gloss;
});

describe("Onyx demo contrast on a light page", () => {
  it("switches the ramp preview to light text and neutral colors", async () => {
    render(<OklchRampDemo />);
    const button = screen.getByRole("button", {
      name: "Button",
    });
    await waitFor(() => expect(lightness(button)).toBeLessThan(50));

    root().dataset.glassTint = "onyx";
    root().style.setProperty("--glass-tint-c", "0");
    root().style.setProperty("--glass-tint-a", "0.94");

    await waitFor(() => expect(lightness(button)).toBeGreaterThan(75));
    expect(screen.getByText(/Neutral theme → achromatic/)).toBeInTheDocument();
    expect(root().classList.contains("dark")).toBe(false);
  });

  it("re-bands crystal swatch labels when the preset changes to Onyx", async () => {
    render(<CrystalGlossDemo />);
    const label = screen.getByText("Rose");
    await waitFor(() => expect(lightness(label)).toBeLessThan(50));
    root().dataset.glassTint = "onyx";
    await waitFor(() => expect(lightness(label)).toBeGreaterThan(75));
    expect(root().classList.contains("dark")).toBe(false);
  });
});
