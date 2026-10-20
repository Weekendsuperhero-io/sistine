/**
 * Menubar: material-aware, and its menus render in portals, sub menus included.
 *
 * Same reason as dropdown-menu and context-menu (tests/menu-sub-portal.test.tsx): a glass menu's
 * backdrop-filter makes it the containing block of every fixed-position descendant, so a sub menu left
 * inside it is positioned against the menu and clipped by it.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

function openMenubar(props: { variant?: "default" | "glass" } = {}) {
  render(
    <Menubar value="file" variant={props.variant}>
      <MenubarMenu value="file">
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent variant={props.variant}>
          <MenubarItem>New tab</MenubarItem>
          <MenubarSub open>
            <MenubarSubTrigger>Share</MenubarSubTrigger>
            <MenubarSubContent variant={props.variant}>
              <MenubarItem>Email link</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>,
  );
  return {
    bar: document.querySelector('[data-slot="menubar"]') as HTMLElement,
    content: document.querySelector('[data-slot="menubar-content"]') as HTMLElement,
    sub: document.querySelector('[data-slot="menubar-sub-content"]') as HTMLElement,
  };
}

describe("Menubar", () => {
  it("portals the sub menu out of the menu", () => {
    const { content, sub } = openMenubar();
    expect(content).not.toBeNull();
    expect(sub).not.toBeNull();
    expect(screen.getByText("Email link")).toBeInTheDocument();
    expect(sub.closest('[data-slot="menubar-content"]')).toBeNull();
  });

  it("portals the menu out of the bar", () => {
    const { bar, content } = openMenubar();
    expect(bar.contains(content)).toBe(false);
  });

  it("draws the bar as bordered glass and both menus as bordered, veiled glass", () => {
    const { bar, content, sub } = openMenubar();
    expect(bar).toHaveClass("glass", "glass-border");
    expect(bar).not.toHaveClass("glass-veil");
    for (const menu of [
      content,
      sub,
    ])
      expect(menu).toHaveClass("glass", "glass-border", "glass-veil");
  });

  it("highlights rows with the accent token", () => {
    openMenubar();
    const item = screen.getByText("New tab");
    expect(item.className).toContain("focus:bg-accent");
  });

  it("drops the surface for variant=default", () => {
    const { bar, content } = openMenubar({
      variant: "default",
    });
    expect(bar).not.toHaveClass("glass");
    expect(content).not.toHaveClass("glass");
    expect(content).toHaveClass("bg-popover");
  });
});
