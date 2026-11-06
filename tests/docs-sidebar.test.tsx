import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocsSidebar } from "@/components/docs-sidebar";
import { getComponents, getUiComponents, getUtilities } from "@/lib/registry";

/**
 * TST-1-3 — the docs sidebar lists UI components under "Components" and the theme utilities and effects
 * under their own "Utilities" group. The split is read off the registry (an item is a UI component when its
 * own file lives in components/ui/), so these also pin that rule.
 */
const UTILITIES = [
  "Auto Foreground",
  "Canvas Background",
  "Gradient Background",
  "Gradient Text",
  "Readable Text",
];

/** The links listed under a sidebar section heading. */
const linksUnder = (title: string) => {
  const heading = screen.getByRole("heading", {
    level: 3,
    name: title,
  });
  return [
    ...(heading.parentElement?.querySelectorAll<HTMLAnchorElement>("a") ?? []),
  ].map((a) => ({
    title: a.textContent?.trim() ?? "",
    href: a.getAttribute("href"),
  }));
};

describe("DocsSidebar", () => {
  it("lists the utilities in their own group, each linked to its docs page", () => {
    render(<DocsSidebar />);
    const utilities = linksUnder("Utilities");
    expect(utilities.map((l) => l.title).sort()).toEqual(UTILITIES);
    for (const item of getUtilities()) {
      expect(utilities).toContainEqual({
        title: item.title ?? item.name,
        href: `/docs/components/${item.name}`,
      });
    }
  });

  it("keeps the utilities out of Components", () => {
    render(<DocsSidebar />);
    const components = linksUnder("Components").map((l) => l.title);
    expect(components).toHaveLength(getUiComponents().length);
    for (const name of UTILITIES) expect(components).not.toContain(name);
    expect(components).toContain("Button");
  });
});

describe("registry: UI components vs utilities", () => {
  it("splits every registry component into exactly one group, by where its own file lives", () => {
    const ui = getUiComponents();
    const utilities = getUtilities();
    expect(ui.length + utilities.length).toBe(getComponents().length);
    for (const item of ui)
      expect(
        item.files.some((f) => f.path.startsWith("components/ui/")),
        item.name,
      ).toBe(true);
    for (const item of utilities)
      expect(
        item.files.some((f) => f.path.startsWith("components/ui/")),
        item.name,
      ).toBe(false);
  });
});
