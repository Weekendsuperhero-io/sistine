import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ThemesPage from "@/app/themes/page";

describe("Theme editor color controls", () => {
  it("keeps authored OKLCH in the text field and provides hex to the native picker", () => {
    const view = render(<ThemesPage />);
    const custom = screen.getByRole("tab", {
      name: "Custom",
    });
    fireEvent.mouseDown(custom, {
      button: 0,
      ctrlKey: false,
    });
    const text = screen.getByLabelText(/^primary$/i);
    const picker = screen.getByLabelText("primary color picker");
    expect((text as HTMLInputElement).value).toContain("oklch(");
    expect((picker as HTMLInputElement).value).toMatch(/^#[\da-f]{6}$/i);
    expect(picker).not.toHaveValue("#000000");
    for (const input of view.container.querySelectorAll<HTMLInputElement>('input[type="color"]')) {
      expect(input.getAttribute("value")).toMatch(/^#[\da-f]{6}$/i);
    }
  });
});
