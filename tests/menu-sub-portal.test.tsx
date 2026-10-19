/**
 * Sub menus render in a portal, like the menu that opens them.
 *
 * A glass menu draws a `backdrop-filter`, and an element with a backdrop filter is the containing block
 * of every fixed-position descendant. Radix positions a sub menu with `position: fixed`, so a SubContent
 * rendered INSIDE the menu was placed against the menu rather than the viewport, and clipped by the
 * menu's `overflow-y-auto`: the sub menu opened as a sliver inside its parent. Portaling it, as Content
 * already is, takes it out of that box. The assertion is structural (no menu-content ancestor) because
 * jsdom computes no layout to clip against.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

describe("DropdownMenuSubContent", () => {
  it("is portaled out of the menu content", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
          <DropdownMenuSub open>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Nested</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const sub = document.querySelector('[data-slot="dropdown-menu-sub-content"]');
    expect(sub).not.toBeNull();
    expect(screen.getByText("Nested")).toBeInTheDocument();
    expect(sub?.closest('[data-slot="dropdown-menu-content"]')).toBeNull();
  });

  it("still carries the menu's glass surface", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub open>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Nested</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(document.querySelector('[data-slot="dropdown-menu-sub-content"]')).toHaveClass("glass", "glass-border", "glass-veil");
  });
});

describe("ContextMenuSubContent", () => {
  it("is portaled out of the menu content", () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Target</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Item</ContextMenuItem>
          <ContextMenuSub open>
            <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>Nested</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText("Target"));

    const sub = document.querySelector('[data-slot="context-menu-sub-content"]');
    expect(sub).not.toBeNull();
    expect(screen.getByText("Nested")).toBeInTheDocument();
    expect(sub?.closest('[data-slot="context-menu-content"]')).toBeNull();
  });
});
