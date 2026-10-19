/**
 * Item: each variant's surface role, and Empty/Kbd's surfaces (the small adopted items).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Empty, EmptyMedia } from "@/components/ui/empty";
import { Item } from "@/components/ui/item";
import { Kbd } from "@/components/ui/kbd";

describe("Item", () => {
  it("is a plain row by default", () => {
    render(<Item data-testid="i">Row</Item>);
    expect(screen.getByTestId("i")).not.toHaveClass("glass");
  });

  it("is bordered glass as outline and borderless glass as muted", () => {
    render(
      <>
        <Item variant="outline" data-testid="outline">
          A
        </Item>
        <Item variant="muted" data-testid="muted">
          B
        </Item>
      </>,
    );
    expect(screen.getByTestId("outline")).toHaveClass("glass", "glass-border");
    expect(screen.getByTestId("muted")).toHaveClass("glass");
    expect(screen.getByTestId("muted")).not.toHaveClass("glass-border");
  });

  it("renders its child element with asChild", () => {
    render(
      <Item asChild variant="outline">
        <a href="#security">Security settings</a>
      </Item>,
    );
    const link = screen.getByText("Security settings");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("data-slot", "item");
    expect(link).toHaveClass("glass");
  });
});

describe("Empty and Kbd", () => {
  it("keeps Empty plain unless asked for glass", () => {
    render(
      <>
        <Empty data-testid="plain" />
        <Empty variant="glass" data-testid="glass" />
      </>,
    );
    expect(screen.getByTestId("plain")).not.toHaveClass("glass");
    expect(screen.getByTestId("glass")).toHaveClass("glass");
  });

  it("draws the icon media as a bordered small-tier chip", () => {
    render(<EmptyMedia variant="icon" data-testid="m" />);
    expect(screen.getByTestId("m")).toHaveClass("glass", "glass-border", "glass-sm");
  });

  it("draws a key cap in theme tokens, not a glass surface", () => {
    render(<Kbd>K</Kbd>);
    const cap = screen.getByText("K");
    expect(cap).toHaveClass("bg-foreground/10", "border-[var(--glass-border)]");
    expect(cap).not.toHaveClass("glass");
  });
});
