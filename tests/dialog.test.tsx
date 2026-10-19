/**
 * TST-4-2 — `bodyClassName` on DialogContent.
 *
 * The overflow fix wraps `children` in a scrolling grid. `className` targets the OUTER surface, so
 * without a second hook a consumer had no way to reach that wrapper — they were stuck with
 * `grid gap-4` on every dialog body. These pin that the prop reaches the right element, that it merges
 * rather than replaces, and that the defaults survive when it is omitted.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function open(props: React.ComponentProps<typeof DialogContent> = {}) {
  render(
    <Dialog open>
      <DialogContent {...props}>
        <DialogTitle>Title</DialogTitle>
        <p data-testid="body-child">Body</p>
      </DialogContent>
    </Dialog>,
  );
  const child = screen.getByTestId("body-child");
  const wrapper = child.parentElement;
  if (!wrapper) throw new Error("body wrapper not found");
  return wrapper;
}

describe("DialogContent: bodyClassName", () => {
  it("applies the class to the wrapper around children", () => {
    expect(
      open({
        bodyClassName: "custom-body",
      }),
    ).toHaveClass("custom-body");
  });

  it("merges with the defaults rather than replacing them", () => {
    /* min-h-0 is load-bearing: a grid item defaults to min-height:auto and refuses to shrink below its
       content, so losing it means the dialog silently stops scrolling and clips instead. */
    const wrapper = open({
      bodyClassName: "custom-body",
    });
    expect(wrapper).toHaveClass("min-h-0", "overflow-y-auto", "custom-body");
  });

  it("lets a consumer override the layout it conflicts with", () => {
    /* The point of the prop: tailwind-merge must let `flex` win over the default `grid`, or the
       escape hatch does not actually escape anything. */
    const wrapper = open({
      bodyClassName: "flex gap-0",
    });
    expect(wrapper).toHaveClass("flex", "gap-0");
    expect(wrapper).not.toHaveClass("grid");
    expect(wrapper).not.toHaveClass("gap-4");
  });

  it("keeps the scroll defaults when omitted", () => {
    expect(open()).toHaveClass("grid", "min-h-0", "gap-4", "overflow-y-auto");
  });

  it("cancels the dialog's padding so the scroll container stops clipping child shadows", () => {
    /* `overflow-y: auto` is not one-axis: a non-visible axis forces the other from visible to auto,
       so this wrapper is a scroll container horizontally too and clips at its padding box. Left at
       the dialog's CONTENT box that box-shadow shear was visible as a hard cut down the side of the
       last footer button and under the footer row. The negative margin has to match the dialog's own
       p-6 exactly, or content re-offsets by the difference. */
    const wrapper = open();
    expect(wrapper).toHaveClass("-m-6", "p-6");
    const surface = wrapper.closest("[data-slot=dialog-content]");
    expect(surface).toHaveClass("p-6");
  });

  it("does not leak onto the outer surface", () => {
    /* className and bodyClassName address different elements; crossing them would be worse than
       having no prop at all. */
    const wrapper = open({
      bodyClassName: "custom-body",
      className: "custom-surface",
    });
    const surface = wrapper.closest("[data-slot=dialog-content]");
    expect(surface).toHaveClass("custom-surface");
    expect(surface).not.toHaveClass("custom-body");
    expect(wrapper).not.toHaveClass("custom-surface");
  });
});

/**
 * DialogBody: only the body scrolls.
 *
 * The layout wrapper used to be the one scroll box for everything, header and footer included, and
 * `overflow-y: auto` clips on all four sides: a glass button's glow in the footer was sliced at the edge
 * it touched, and the footer scrolled away with the text. With a DialogBody child the wrapper turns into
 * a non-clipping flex column and the body alone scrolls. jsdom does not evaluate `:has()` for layout, so
 * these pin the classes that do it and the structure they depend on.
 */
function openWithBody() {
  render(
    <Dialog open>
      <DialogContent>
        <DialogHeader data-testid="header">
          <DialogTitle>Title</DialogTitle>
        </DialogHeader>
        <DialogBody data-testid="body" className="custom-body">
          <p>Body</p>
        </DialogBody>
        <DialogFooter data-testid="footer">
          <button type="button">OK</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );
  return {
    header: screen.getByTestId("header"),
    body: screen.getByTestId("body"),
    footer: screen.getByTestId("footer"),
  };
}

describe("DialogBody", () => {
  it("keeps the footer and header outside the scrolling body", () => {
    const { header, body, footer } = openWithBody();
    expect(body).toHaveAttribute("data-slot", "dialog-body");
    expect(body).toHaveClass("overflow-y-auto", "min-h-0", "flex-1");
    expect(body.contains(footer)).toBe(false);
    expect(body.contains(header)).toBe(false);
    /* Siblings in the layout wrapper, so they sit around the scroller rather than in it. */
    expect(footer.parentElement).toBe(body.parentElement);
    expect(header.parentElement).toBe(body.parentElement);
  });

  it("turns the layout wrapper into a non-clipping column only when a body is present", () => {
    const { body } = openWithBody();
    const layout = body.parentElement;
    expect(layout).toHaveAttribute("data-slot", "dialog-layout");
    expect(layout).toHaveClass(
      "has-[>[data-slot=dialog-body]]:flex",
      "has-[>[data-slot=dialog-body]]:flex-col",
      "has-[>[data-slot=dialog-body]]:overflow-visible",
    );
  });

  it("keeps the chrome from shrinking when the body is tall", () => {
    const { header, footer } = openWithBody();
    expect(header).toHaveClass("shrink-0");
    expect(footer).toHaveClass("shrink-0");
  });

  it("runs the scroll box to the dialog's edges, with room for a glow", () => {
    const { body } = openWithBody();
    expect(body).toHaveClass("-mx-6", "px-6", "-my-2", "py-2");
  });

  it("lets its children shrink below their content width", () => {
    const { body } = openWithBody();
    expect(body).toHaveClass("[&>*]:min-w-0");
    expect(body.parentElement).toHaveClass("min-w-0", "[&>*]:min-w-0");
  });

  it("merges a className rather than replacing the defaults", () => {
    const { body } = openWithBody();
    expect(body).toHaveClass("custom-body", "overflow-y-auto", "grid", "gap-4");
  });

  it("leaves a dialog without a body scrolling as one box, as before", () => {
    const wrapper = open();
    expect(wrapper).toHaveAttribute("data-slot", "dialog-layout");
    expect(wrapper).toHaveClass("grid", "overflow-y-auto", "min-h-0");
    expect(wrapper.querySelector('[data-slot="dialog-body"]')).toBeNull();
  });
});
