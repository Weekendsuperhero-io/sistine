/**
 * TST-1-1 — regression guard for the @tanstack/react-table v8 → v9 migration.
 *
 * v9 moved the row models out of table options and into a `tableFeatures()` registry, so sorting,
 * filtering and pagination only work if each feature AND its row-model slot is registered. Forgetting
 * one does not throw — the table renders fine and the affected control silently does nothing, which is
 * exactly the failure a type-check cannot catch. Each test below drives one of the three registered
 * features through the real UI.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DataTableBlock } from "@/components/blocks/data-table";

/** Names in the order the rows currently render. */
function renderedNames(): string[] {
  const rows = screen.getAllByRole("row").slice(1); // drop the header row
  return rows.map((row) => within(row).getAllByRole("cell")[0].textContent?.trim() ?? "");
}

describe("DataTableBlock: react-table v9 features", () => {
  it("paginates: 12 members across 2 pages of 6", async () => {
    const user = userEvent.setup();
    render(<DataTableBlock />);

    expect(renderedNames()).toHaveLength(6);
    expect(screen.getByText(/Page 1 of 2 · 12 members/)).toBeInTheDocument();
    // Page 1 is the fixture order, so a member from the back half must not be present yet.
    expect(screen.queryByText("Tim Berners-Lee")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
    expect(screen.getByText("Tim Berners-Lee")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("sorts: clicking the Name header reorders rows and pulls a new member onto page 1", async () => {
    const user = userEvent.setup();
    render(<DataTableBlock />);

    expect(renderedNames()[0]).toBe("Ada Lovelace");
    // "Barbara Liskov" sits on page 2 unsorted and on page 1 once sorted A→Z. If rowSortingFeature or
    // its sortedRowModel is dropped, the click is inert and this stays absent.
    expect(screen.queryByText("Barbara Liskov")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Name/ }));

    const asc = renderedNames();
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)));
    expect(screen.getByText("Barbara Liskov")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(renderedNames()[0]).toBe("Tim Berners-Lee"); // descending
  });

  it("filters: typing narrows the rows and the count, and repaginates", async () => {
    const user = userEvent.setup();
    render(<DataTableBlock />);

    await user.type(screen.getByPlaceholderText("Filter by name…"), "tur");

    expect(renderedNames()).toEqual([
      "Alan Turing",
    ]);
    expect(screen.getByText(/1 members/)).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
  });

  it("filters case-insensitively via the registered includesString fn", async () => {
    const user = userEvent.setup();
    render(<DataTableBlock />);

    // A missing filterFns entry throws at filter time rather than returning everything, so this also
    // pins that the fn is registered under the name the column refers to.
    await user.type(screen.getByPlaceholderText("Filter by name…"), "ADA");
    expect(renderedNames()).toEqual([
      "Ada Lovelace",
    ]);
  });

  it("clearing the filter restores every row", async () => {
    const user = userEvent.setup();
    render(<DataTableBlock />);
    const input = screen.getByPlaceholderText("Filter by name…");

    await user.type(input, "zzzz");
    // The block renders a single "No results." row rather than an empty tbody, so assert the empty
    // STATE, not a row count of zero.
    expect(screen.getByText("No results.")).toBeInTheDocument();
    expect(screen.getByText(/0 members/)).toBeInTheDocument();

    await user.clear(input);
    expect(screen.getByText(/12 members/)).toBeInTheDocument();
    expect(renderedNames()).toHaveLength(6);
  });
});
