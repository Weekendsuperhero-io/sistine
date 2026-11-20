/**
 * The radio item's indicator (dropdown menu and context menu): a filled dot, drawn only on the checked
 * item. It was phosphor's regular Circle (a ring) sized h-2 w-2, which the item's own
 * `[&_svg:not([class*='size-'])]:size-4` rule overrode to 16px, so the checked item showed an empty
 * 16px ring that read as "not chosen". Now `weight="fill"` and `size-2`, as the menubar's has been.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContextMenu, ContextMenuContent, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

afterEach(cleanup);

const dotOf = (name: string) =>
  screen
    .getByRole("menuitemradio", {
      name,
    })
    .querySelector("svg");

const expectDot = () => {
  const dot = dotOf("Bevel");
  expect(dot, "the checked item draws its dot").not.toBeNull();
  expect(dot?.getAttribute("class") ?? "").toMatch(/\bsize-2\b/);
  expect(dot?.getAttribute("class") ?? "").not.toMatch(/\bh-2\b|\bfill-current\b/);
  expect(dotOf("Frame"), "the unchecked item draws nothing").toBeNull();
};

describe("radio item indicator", () => {
  it("dropdown menu: a filled 0.5rem dot on the checked item only", async () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="bevel">
            <DropdownMenuRadioItem value="bevel">Bevel</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="frame">Frame</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await screen.findByRole("menuitemradio", {
      name: "Bevel",
    });
    expectDot();
  });

  it("context menu: the same", async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent forceMount>
          <ContextMenuRadioGroup value="bevel">
            <ContextMenuRadioItem value="bevel">Bevel</ContextMenuRadioItem>
            <ContextMenuRadioItem value="frame">Frame</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText("Area"));
    await screen.findByRole("menuitemradio", {
      name: "Bevel",
    });
    expectDot();
  });
});
