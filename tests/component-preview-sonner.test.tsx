import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { ComponentPreview } from "@/components/component-preview";
import { Toaster } from "@/components/ui/sonner";

/**
 * TST-1-1 — the Sonner docs preview showed every toast TWICE. The root layout mounts the site's one
 * <Toaster />, and the preview mounted a second, so each toast() landed in both. Rendered here the way the
 * site renders it, under a single root Toaster: one toast per click, and the preview adds no toaster.
 */
/* sonner resolves theme="system" through matchMedia, which jsdom does not implement (as in sonner.test.tsx). */
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

describe("ComponentPreview: sonner", () => {
  it("adds no Toaster of its own", () => {
    const { container } = render(<ComponentPreview componentName="sonner" />);
    expect(container.querySelector("[data-sonner-toaster]")).toBeNull();
    expect(document.querySelector("section[aria-label^='Notifications']")).toBeNull();
  });

  it("shows a toast once under the root layout's Toaster", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Toaster />
        <ComponentPreview componentName="sonner" />
      </>,
    );
    await user.click(
      screen.getByRole("button", {
        name: "Toast with Action",
      }),
    );
    await waitFor(() => expect(screen.getAllByText("Event Created")).toHaveLength(1));
    expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(1);
    expect(document.querySelectorAll("section[aria-label^='Notifications']")).toHaveLength(1);
  });
});
