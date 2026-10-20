/**
 * Table: a sticky header has to be able to stick.
 *
 * `position: sticky` binds to the NEAREST scroll container, and `overflow: hidden` makes one. The glass
 * variant used to put `rounded-lg overflow-hidden` on the <table> itself (and on its container), so a
 * `sticky top-0` header bound to the table's own box, which never scrolls: it rode along with the rows
 * while an outer element scrolled around it. The corners are now clipped by `overflow-clip` on the
 * container (clip is NOT a scroll container), and `containerClassName` lets a consumer make that
 * container the scroller on purpose.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function renderTable(props: React.ComponentProps<typeof Table> = {}) {
  const { container } = render(
    <Table {...props}>
      <TableHeader className="sticky top-0">
        <TableRow>
          <TableHead>Name</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Row</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
  const wrapper = container.querySelector('[data-slot="table-container"]') as HTMLElement;
  const table = container.querySelector('[data-slot="table"]') as HTMLElement;
  return {
    wrapper,
    table,
  };
}

describe("Table: sticky headers", () => {
  it("never makes the <table> a scroll container", () => {
    for (const variant of [
      "glass",
      "default",
    ] as const) {
      const { table } = renderTable({
        variant,
      });
      expect(table.className).not.toMatch(/\boverflow-(hidden|auto|scroll)\b/);
    }
  });

  it("clips the glass corners on the container without overflow-hidden", () => {
    const { wrapper } = renderTable();
    expect(wrapper).toHaveClass("rounded-lg", "overflow-clip");
    expect(wrapper).not.toHaveClass("overflow-hidden");
  });

  it("keeps the glass surface rounded on the table", () => {
    const { table } = renderTable();
    expect(table).toHaveClass("glass", "rounded-lg");
  });

  it("merges containerClassName onto the container, not the table", () => {
    const { wrapper, table } = renderTable({
      containerClassName: "max-h-96 overflow-y-auto",
    });
    expect(wrapper).toHaveClass("rounded-lg", "overflow-clip", "max-h-96", "overflow-y-auto");
    expect(table).not.toHaveClass("max-h-96");
    expect(table).not.toHaveClass("overflow-y-auto");
  });

  it("does not forward containerClassName to the DOM as an attribute", () => {
    const { table } = renderTable({
      containerClassName: "max-h-96",
    });
    expect(table.getAttribute("containerclassname")).toBeNull();
    expect(table.getAttribute("containerClassName")).toBeNull();
  });

  it("leaves the default variant's container unstyled unless asked", () => {
    const { wrapper } = renderTable({
      variant: "default",
    });
    expect(wrapper.className).toBe("");
    const asked = renderTable({
      variant: "default",
      containerClassName: "max-h-96 overflow-y-auto",
    });
    expect(asked.wrapper).toHaveClass("max-h-96", "overflow-y-auto");
  });
});
