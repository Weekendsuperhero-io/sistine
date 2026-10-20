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
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";

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

/* Multiple selection: each chosen value is a chip, and each chip's remove button (named "Remove <value>",
   since it is an icon) takes that value back out. Composed as the Combobox story does. */
function Chips({ onValueChange, defaultOpen }: { onValueChange?: (v: string[]) => void; defaultOpen?: boolean }) {
  const anchor = useComboboxAnchor();
  return (
    <Combobox
      items={fruits}
      multiple
      defaultValue={[
        "Apple",
        "Banana",
      ]}
      onValueChange={onValueChange}
      defaultOpen={defaultOpen}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>{(values: string[]) => values.map((value) => <ComboboxChip key={value}>{value}</ComboboxChip>)}</ComboboxValue>
        <ComboboxChipsInput placeholder="Add fruit" />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

const chips = () =>
  [
    ...document.querySelectorAll('[data-slot="combobox-chip"]'),
  ].map((c) => c.textContent);

describe("Combobox with multiple selection", () => {
  it("shows a chip for each selected value", () => {
    render(<Chips />);
    expect(chips()).toEqual([
      "Apple",
      "Banana",
    ]);
  });

  it("removes a value through its chip's named remove button", async () => {
    const changes: string[][] = [];
    render(<Chips onValueChange={(v) => changes.push(v)} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Apple",
      }),
    );
    await waitFor(() =>
      expect(chips()).toEqual([
        "Banana",
      ]),
    );
    expect(changes.at(-1)).toEqual([
      "Banana",
    ]);
  });

  it("adds a chip when another option is chosen", async () => {
    render(<Chips defaultOpen />);
    await waitFor(() => expect(screen.getByText("Cherry")).toBeInTheDocument());
    fireEvent.click(option("Cherry"));
    await waitFor(() =>
      expect(chips()).toEqual([
        "Apple",
        "Banana",
        "Cherry",
      ]),
    );
  });
});
