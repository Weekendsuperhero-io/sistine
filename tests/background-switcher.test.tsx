/**
 * TST-4-1 — the colour picker's themed default must be applied on FOCUS, not pointerdown.
 *
 * `<input type="color">` only accepts hex, so the themed default (authored as oklch) has to be
 * converted and written onto the input before the picker opens. That used to happen in
 * `onPointerDown`, which never fires for someone who tabs to the swatch and presses Space/Enter — they
 * opened the picker on whatever stale value the input happened to hold.
 *
 * These tests drive the keyboard path specifically, since that is the one that was broken.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BackgroundProvider } from "@/components/background-provider";
import { BackgroundSwitcher } from "@/components/background-switcher";
import { oklchToSrgb } from "@/lib/oklch-utils";

/** The same conversion the component does, derived independently so the test is not a tautology. */
function expectedHex(hue: number): string {
  const hex = oklchToSrgb(85, 0.03, hue)
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
  return `#${hex}`;
}

/** The picker only renders under the "none" background, so switch to it first. */
async function renderWithPicker(user: ReturnType<typeof userEvent.setup>) {
  const view = render(
    <BackgroundProvider>
      <BackgroundSwitcher />
    </BackgroundProvider>,
  );
  await user.click(
    screen.getByRole("button", {
      name: "None background",
    }),
  );
  const input = view.container.querySelector<HTMLInputElement>('input[type="color"]');
  if (!input) throw new Error("colour input did not render under the none background");
  return input;
}

describe("BackgroundSwitcher: themed colour default", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.setProperty("--glass-tint-h", "250");
  });
  afterEach(() => document.documentElement.style.removeProperty("--glass-tint-h"));

  it("populates the input on focus: the keyboard path", async () => {
    const user = userEvent.setup();
    const input = await renderWithPicker(user);
    expect(input.value).not.toBe(expectedHex(250));

    // No pointer involved: this is exactly what tabbing to the control does.
    input.focus();

    expect(input.value).toBe(expectedHex(250));
  });

  it("populates on pointer activation too: focus precedes click", async () => {
    const user = userEvent.setup();
    const input = await renderWithPicker(user);

    await user.click(input);

    expect(input.value).toBe(expectedHex(250));
  });

  it("tracks the live tint rather than a value captured at mount", async () => {
    /* The hue changes whenever the preset does, which is why this is read at open time instead of
       held in state. Re-focusing after a tint change must pick up the new hue. */
    const user = userEvent.setup();
    const input = await renderWithPicker(user);
    input.focus();
    expect(input.value).toBe(expectedHex(250));

    input.blur();
    document.documentElement.style.setProperty("--glass-tint-h", "120");
    input.focus();

    expect(input.value).toBe(expectedHex(120));
    expect(expectedHex(120)).not.toBe(expectedHex(250));
  });

  it("does not overwrite a colour the user has already picked", async () => {
    const user = userEvent.setup();
    const input = await renderWithPicker(user);

    // Choosing a colour sets baseColor, after which the themed default must stop being applied.
    // fireEvent.change, not a raw .value assignment: React tracks the value internally, so setting it
    // directly and dispatching leaves onChange unfired and baseColor null.
    await user.click(input);
    fireEvent.change(input, {
      target: {
        value: "#123456",
      },
    });
    input.blur();
    input.focus();

    expect(input.value).toBe("#123456");
  });
});
