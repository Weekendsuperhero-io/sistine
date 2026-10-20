/**
 * Toaster: toasts are glass surfaces from the material system, and status toasts take their status tint.
 *
 * The theme used to style toasts itself, with `[data-sonner-toast]` selectors woven through the engine,
 * the presets and every page style, plus !important overrides against sonner's own unlayered stylesheet
 * (which beat every Tailwind utility, so the `glass` classes the Toaster passed were dead). Now the
 * Toaster is `unstyled`, the surface is `glassMaterial()`, and an observer stamps `data-glass-tint` from
 * sonner's `data-type` so the theme's ordinary status blocks tint the toast. These pin that contract.
 */
import { act, render, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { TOAST_TINT, Toaster } from "@/components/ui/sonner";

/* sonner resolves theme="system" through matchMedia, which jsdom does not implement. */
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

const toastByTitle = (title: string) =>
  [
    ...document.querySelectorAll<HTMLElement>("[data-sonner-toast]"),
  ].find((t) => t.querySelector("[data-title]")?.textContent === title);

async function show(fire: () => void, title: string) {
  act(fire);
  await waitFor(() => expect(toastByTitle(title)).toBeDefined());
  return toastByTitle(title) as HTMLElement;
}

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
});

describe("Toaster", () => {
  it("renders unstyled toasts on the glass material", async () => {
    render(<Toaster />);
    const el = await show(() => toast("Plain"), "Plain");
    expect(el).toHaveAttribute("data-styled", "false");
    expect(el).toHaveClass("glass", "glass-border", "glass-veil", "glass-lg", "rounded-xl");
  });

  it.each(Object.entries(TOAST_TINT))("stamps a %s toast with data-glass-tint=%s", async (type, tint) => {
    render(<Toaster />);
    const fire = {
      success: () => toast.success(`T-${type}`),
      error: () => toast.error(`T-${type}`),
      warning: () => toast.warning(`T-${type}`),
      info: () => toast.info(`T-${type}`),
    }[type];
    if (!fire) throw new Error(`no trigger for ${type}`);
    const el = await show(fire, `T-${type}`);
    await waitFor(() => expect(el).toHaveAttribute("data-glass-tint", tint));
  });

  it("leaves a default toast on the page tint", async () => {
    render(<Toaster />);
    const el = await show(() => toast("Default"), "Default");
    expect(el).not.toHaveAttribute("data-glass-tint");
  });

  it("re-stamps a promise toast when it settles", async () => {
    render(<Toaster />);
    let resolve: (v: unknown) => void = () => {};
    const promise = new Promise((r) => {
      resolve = r;
    });
    act(() => {
      toast.promise(promise, {
        loading: "Saving",
        success: "Saved",
        error: "Failed",
      });
    });
    await waitFor(() => expect(toastByTitle("Saving")).toBeDefined());
    expect(toastByTitle("Saving")).not.toHaveAttribute("data-glass-tint");
    await act(async () => {
      resolve(undefined);
      await promise;
    });
    await waitFor(() => expect(toastByTitle("Saved")).toHaveAttribute("data-glass-tint", "success"));
  });

  it("merges a consumer's classNames key by key", async () => {
    render(
      <Toaster
        toastOptions={{
          classNames: {
            title: "custom-title",
          },
        }}
      />,
    );
    const el = await show(() => toast("Merged"), "Merged");
    expect(el.querySelector("[data-title]")).toHaveClass("custom-title", "font-medium");
    expect(el).toHaveClass("glass");
  });
});
