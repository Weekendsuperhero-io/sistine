/**
 * Combobox: an enabled option is clickable.
 *
 * The bug this pins came from cmdk (tests/command.test.tsx): a primitive that writes
 * `data-disabled="false"` on every enabled item turns Tailwind's bare `data-disabled:` variant, a
 * presence selector, into `pointer-events: none` on every row. Base UI omits the attribute when an item
 * is enabled, which is what makes the bare variant safe in combobox.tsx; if that ever changes, these fail
 * before a user finds a picker that cannot be clicked.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";

const fruits = [
  "Apple",
  "Banana",
  "Cherry",
];

function renderOpen(onValueChange?: (v: unknown) => void) {
  render(
    <Combobox items={fruits} defaultOpen onValueChange={onValueChange}>
      <ComboboxInput placeholder="Select a fruit" />
      <ComboboxContent>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item} disabled={item === "Cherry"}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>,
  );
}

const option = (name: string) => screen.getByText(name).closest('[data-slot="combobox-item"]') as HTMLElement;

describe("Combobox", () => {
  it("puts no data-disabled attribute on an enabled item", async () => {
    renderOpen();
    await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
    expect(option("Apple").hasAttribute("data-disabled")).toBe(false);
    expect(option("Cherry").hasAttribute("data-disabled")).toBe(true);
  });

  it("selects an enabled item on click", async () => {
    const changes: unknown[] = [];
    renderOpen((v) => changes.push(v));
    await waitFor(() => expect(screen.getByText("Banana")).toBeInTheDocument());
    fireEvent.click(option("Banana"));
    await waitFor(() => expect(changes).toContain("Banana"));
  });

  it("draws the popup as bordered, veiled glass", async () => {
    renderOpen();
    await waitFor(() => expect(document.querySelector('[data-slot="combobox-content"]')).not.toBeNull());
    expect(document.querySelector('[data-slot="combobox-content"]')).toHaveClass("glass", "glass-border", "glass-veil", "rounded-xl");
  });
});
