import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MaterialComparison } from "@/components/material-comparison";
import { GLASS_TINT_PRESETS } from "@/lib/glass-presets";
import { MATERIALS } from "@/lib/material";

afterEach(() => {
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  delete document.documentElement.dataset.glassTint;
});

describe("Full material comparison", () => {
  it("shows the complete palette directly on the page without a separate mode or backdrop", () => {
    document.documentElement.className = "dark";
    document.documentElement.dataset.glassTint = "onyx";
    document.documentElement.style.setProperty("--glass-opacity", "0.2");
    const { container } = render(<MaterialComparison />);
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards).toHaveLength(GLASS_TINT_PRESETS.length * MATERIALS.length);
    expect(container.querySelector("iframe")).toBeNull();
    expect(
      screen.queryByRole("radiogroup", {
        name: "Comparison mode",
      }),
    ).not.toBeInTheDocument();
    expect(container.querySelector(".material-comparison-preview")).toBeNull();
    for (const preset of GLASS_TINT_PRESETS) {
      expect(
        screen.getByRole("rowheader", {
          name: preset.label,
        }),
      ).toBeInTheDocument();
      expect(container.querySelectorAll(`[data-slot="card"][data-glass-tint="${preset.value}"]`)).toHaveLength(MATERIALS.length);
    }
    for (const card of cards) expect(card.closest("html")).toBe(document.documentElement);
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    expect(cards[0].closest(".dark")).toBeNull();
    expect(cards[0].closest(".light")).toBe(document.documentElement);
    expect(document.documentElement.dataset.glassTint).toBe("onyx");
    expect(document.documentElement.style.getPropertyValue("--glass-opacity")).toBe("0.2");
  });
});
