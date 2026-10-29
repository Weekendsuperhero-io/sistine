import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallationInstructions } from "@/components/installation-instructions";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Installation instructions copy button", () => {
  it("shows a checkmark for the package manager whose command was copied", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });
    render(<InstallationInstructions componentName="button" />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy bun install command",
      }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Command copied",
        }),
      ).toBeTruthy();
    });
    expect(writeText).toHaveBeenCalledWith("bunx shadcn@latest add @sistine/button");
  });
});
