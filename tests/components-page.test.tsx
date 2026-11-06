import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ComponentsPage from "@/app/components/page";
import { getUiComponents, getUtilities } from "@/lib/registry";

/**
 * TST-1-2 — the components index lists UI components in its main grid and the theme utilities and effects
 * (AutoForeground, the backgrounds, …) under their own "Utilities" heading, and the search filters both.
 */
const UTILITIES = [
  "Auto Foreground",
  "Canvas Background",
  "Gradient Background",
  "Gradient Text",
  "Readable Text",
];

/** The cards (component links) in a container, by their titles. */
const cardTitles = (root: HTMLElement) =>
  [
    ...root.querySelectorAll<HTMLAnchorElement>('a[href^="/docs/components/"]'),
  ].map((a) => a.querySelector("[data-slot='card-title']")?.textContent ?? a.textContent ?? "");

const sections = () => {
  const heading = screen.queryByRole("heading", {
    name: "Utilities",
  });
  const utilities = heading?.closest("section") ?? null;
  const grid = screen
    .getByRole("heading", {
      level: 1,
      name: "Components",
    })
    .closest("div.container") as HTMLElement;
  const all = cardTitles(grid);
  const inUtilities = utilities ? cardTitles(utilities) : [];
  return {
    utilities,
    inUtilities,
    inComponents: all.filter((t) => !inUtilities.includes(t)),
  };
};

describe("ComponentsPage", () => {
  it("lists UI components in the grid and the utilities under their own heading", () => {
    render(<ComponentsPage />);
    const { utilities, inUtilities, inComponents } = sections();
    expect(utilities).not.toBeNull();
    expect(inUtilities.sort()).toEqual(UTILITIES);
    expect(inComponents).toHaveLength(getUiComponents().length);
    for (const name of UTILITIES) expect(inComponents).not.toContain(name);
    expect(screen.getByText(`Browse our collection of ${getUiComponents().length} beautiful, glassy UI components.`)).toBeInTheDocument();
  });

  it("filters both sections with the search", async () => {
    const user = userEvent.setup();
    render(<ComponentsPage />);
    const search = screen.getByPlaceholderText("Search components...");

    // "text" reaches both: Textarea among the components; among the utilities Gradient Text and Readable
    // Text by title, and Auto Foreground by its description ("…so text contrast tracks…").
    await user.type(search, "text");
    let s = sections();
    expect(s.inComponents).toContain("Textarea");
    expect(s.inComponents).not.toContain("Button");
    expect(s.inUtilities.sort()).toEqual([
      "Auto Foreground",
      "Gradient Text",
      "Readable Text",
    ]);

    // A query only components match hides the Utilities section entirely.
    await user.clear(search);
    await user.type(search, "accordion");
    s = sections();
    expect(s.utilities).toBeNull();
    expect(s.inComponents).toEqual([
      "Accordion",
    ]);

    // Nothing matches: one empty state for the whole page.
    await user.clear(search);
    await user.type(search, "zzqq-nothing");
    s = sections();
    expect(s.utilities).toBeNull();
    expect(s.inComponents).toEqual([]);
    expect(screen.getByText("No components found matching your search.")).toBeInTheDocument();
  });

  it("links every utility to its docs page", () => {
    render(<ComponentsPage />);
    const section = within(sections().utilities as HTMLElement);
    for (const item of getUtilities()) {
      expect(
        section.getByRole("link", {
          name: new RegExp(item.title ?? item.name),
        }),
      ).toHaveAttribute("href", `/docs/components/${item.name}`);
    }
  });
});
