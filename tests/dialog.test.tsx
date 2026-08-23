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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
