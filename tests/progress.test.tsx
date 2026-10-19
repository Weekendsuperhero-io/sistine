/**
 * Progress: Slider's track and fill, and the indicator offset that draws the value.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "@/components/ui/progress";

const parts = (value?: number) => {
  const { container } = render(<Progress value={value} />);
  return {
    root: container.querySelector('[data-slot="progress"]') as HTMLElement,
    indicator: container.querySelector('[data-slot="progress-indicator"]') as HTMLElement,
  };
};

describe("Progress", () => {
  it("offsets the indicator by the remaining fraction", () => {
    expect(parts(66).indicator.style.transform).toBe("translateX(-34%)");
    expect(parts(100).indicator.style.transform).toBe("translateX(-0%)");
  });

  it("treats a missing value as empty", () => {
    expect(parts(undefined).indicator.style.transform).toBe("translateX(-100%)");
  });

  it("uses the slider's track and the glass accent fill", () => {
    const { root, indicator } = parts(50);
    expect(root).toHaveClass("bg-foreground/15", "rounded-full");
    expect(indicator).toHaveClass("bg-[var(--glass-accent)]");
  });

  it("reports the value to assistive tech", () => {
    const { root } = parts(40);
    expect(root).toHaveAttribute("role", "progressbar");
    expect(root).toHaveAttribute("aria-valuenow", "40");
  });
});
