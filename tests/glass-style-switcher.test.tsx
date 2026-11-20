import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GlassStyleSwitcher } from "@/components/glass-style-switcher";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.glass = "crystal";
  document.documentElement.dataset.glassTint = "onyx";
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.glass;
  delete document.documentElement.dataset.glassTint;
  delete document.documentElement.dataset.glossShape;
});

describe("GlassStyleSwitcher", () => {
  it("migrates a saved opaque preference to Lucite", () => {
    localStorage.setItem("sistine-glass-style", "opaque");
    render(<GlassStyleSwitcher />);
    expect(document.documentElement.dataset.glass).toBe("lucite");
    expect(localStorage.getItem("sistine-glass-style")).toBe("lucite");
  });

  it("shows and persists Lucite as the canonical style", async () => {
    const user = userEvent.setup();
    render(<GlassStyleSwitcher />);
    await user.click(
      screen.getByRole("button", {
        name: "Glass style",
      }),
    );
    expect(
      screen.queryByRole("menuitem", {
        name: "Opaque",
      }),
    ).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole("menuitem", {
        name: "Lucite",
      }),
    );
    expect(document.documentElement.dataset.glass).toBe("lucite");
    expect(localStorage.getItem("sistine-glass-style")).toBe("lucite");
  });
  it("selects and persists Lustre independently of the tint", async () => {
    const user = userEvent.setup();
    render(<GlassStyleSwitcher />);
    await user.click(
      screen.getByRole("button", {
        name: "Glass style",
      }),
    );
    await user.click(
      await screen.findByRole("menuitem", {
        name: "Lustre",
      }),
    );
    expect(document.documentElement.dataset.glass).toBe("lustre");
    expect(document.documentElement.dataset.glassTint).toBe("onyx");
    expect(localStorage.getItem("sistine-glass-style")).toBe("lustre");
  });

  it("restores a saved Lustre style after remount", () => {
    localStorage.setItem("sistine-glass-style", "lustre");
    render(<GlassStyleSwitcher />);
    expect(document.documentElement.dataset.glass).toBe("lustre");
  });

  it("returns to the adaptive Glass default using the keyboard", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sistine-glass-style", "lustre");
    render(<GlassStyleSwitcher />);
    screen
      .getByRole("button", {
        name: "Glass style",
      })
      .focus();
    await user.keyboard("{Enter}{Home}{Enter}");
    expect(document.documentElement.dataset.glass).toBeUndefined();
    expect(document.documentElement.dataset.glassTint).toBe("onyx");
  });

  it("offers the gloss shape while Crystal is the style, and Frame sets and remembers it", async () => {
    const user = userEvent.setup();
    render(<GlassStyleSwitcher />);
    expect(document.documentElement.dataset.glossShape).toBe("bevel");
    await user.click(
      screen.getByRole("button", {
        name: "Glass style",
      }),
    );
    expect(await screen.findByText("Gloss shape")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", {
        name: "Bevel",
      }),
    ).toHaveAttribute("aria-checked", "true");
    await user.click(
      screen.getByRole("menuitemradio", {
        name: "Frame",
      }),
    );
    expect(document.documentElement.dataset.glossShape).toBe("frame");
    expect(localStorage.getItem("sistine-gloss-shape")).toBe("frame");
    await user.click(
      screen.getByRole("button", {
        name: "Glass style",
      }),
    );
    expect(
      await screen.findByRole("menuitemradio", {
        name: "Frame",
      }),
    ).toHaveAttribute("aria-checked", "true");
    await user.click(
      screen.getByRole("menuitemradio", {
        name: "Bevel",
      }),
    );
    expect(document.documentElement.dataset.glossShape).toBe("bevel");
    expect(localStorage.getItem("sistine-gloss-shape")).toBe("bevel");
  });

  it("offers the shape under Chakra, which wears the same gloss, and not under Lustre", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sistine-glass-style", "chakra");
    render(<GlassStyleSwitcher />);
    await user.click(
      screen.getByRole("button", {
        name: "Glass style",
      }),
    );
    expect(
      await screen.findByRole("menuitemradio", {
        name: "Frame",
      }),
    ).toBeInTheDocument();
    cleanup();
    localStorage.setItem("sistine-glass-style", "lustre");
    render(<GlassStyleSwitcher />);
    await user.click(
      screen.getByRole("button", {
        name: "Glass style",
      }),
    );
    await screen.findByRole("menuitem", {
      name: /^Lustre/,
    });
    expect(screen.queryByText("Gloss shape")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitemradio", {
        name: "Bevel",
      }),
    ).not.toBeInTheDocument();
  });

  it("restores a stored frame on mount, on any page", () => {
    localStorage.setItem("sistine-gloss-shape", "frame");
    render(<GlassStyleSwitcher />);
    expect(document.documentElement.dataset.glossShape).toBe("frame");
  });
});
