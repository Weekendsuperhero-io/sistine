import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Carousel } from "@/components/ui/carousel";

beforeEach(() =>
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
);
afterEach(() => vi.unstubAllGlobals());

describe("Carousel changing content", () => {
  it("renders nothing when it has no slides", () => {
    const view = render(<Carousel autoPlay />);
    expect(view.container.querySelector('[data-slot="carousel"]')).toBeNull();
    expect(view.container.innerHTML).not.toContain("NaN");
  });

  it("keeps a remaining slide visible when the active slide is removed", () => {
    const view = render(
      <Carousel>
        <div>One</div>
        <div>Two</div>
        <div>Three</div>
      </Carousel>,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Go to slide 3",
      }),
    );
    view.rerender(
      <Carousel>
        <div>One</div>
        <div>Two</div>
      </Carousel>,
    );
    expect(view.container.querySelector('[data-slot="carousel-content"]')).toHaveStyle({
      transform: "translateX(-100%)",
    });
    expect(view.container.querySelectorAll('[data-slot="carousel-item"]')[1]).not.toHaveAttribute("inert");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Next slide",
      }),
    );
    expect(view.container.querySelector('[data-slot="carousel-content"]')).toHaveStyle({
      transform: "translateX(-0%)",
    });
  });

  it("leaves arrow keys available to a text field inside a slide", () => {
    const edit = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    const view = render(
      <Carousel>
        <input aria-label="Caption" />
        <div>Two</div>
      </Carousel>,
    );
    fireEvent(
      screen.getByRole("textbox", {
        name: "Caption",
      }),
      edit,
    );
    expect(edit.defaultPrevented).toBe(false);
    expect(view.container.querySelector('[data-slot="carousel-content"]')).toHaveStyle({
      transform: "translateX(-0%)",
    });
  });
});
