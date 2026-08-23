/**
 * TST-1-2 (the half that needs a DOM) — ref composition and the MutationObserver wiring.
 *
 * The pure rounding is covered without a DOM in scripts/check-units.mjs. What needs jsdom is the
 * behaviour AROUND it: that the hook finds the Radix wrapper, re-snaps when Radix rewrites the
 * transform, does not loop on its own write, and that composeRefs still hands the node to the
 * forwarded ref (drop that and every consumer's ref silently becomes null).
 */
import { render } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { composeRefs, snapTransform, useComposedRefs, useSnappedPopper } from "@/lib/snap-popper";

/** Mirrors Radix: a positioned wrapper with the content inside it. */
function Popper({ initial, onWrapper }: { initial: string; onWrapper?: (el: HTMLElement) => void }) {
  const snapRef = useSnappedPopper<HTMLDivElement>();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (wrapperRef.current) onWrapper?.(wrapperRef.current);
  }, [
    onWrapper,
  ]);
  return (
    <div
      ref={wrapperRef}
      data-radix-popper-content-wrapper=""
      style={{
        transform: initial,
      }}
    >
      <div ref={snapRef} data-testid="content" />
    </div>
  );
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("useSnappedPopper", () => {
  it("snaps the wrapper transform to whole pixels on mount", () => {
    let wrapper: HTMLElement | undefined;
    render(<Popper initial="translate(188.5px, 42.25px)" onWrapper={(el) => (wrapper = el)} />);
    expect(wrapper?.style.transform).toBe("translate(189px, 42px)");
  });

  it("re-snaps after Radix rewrites the transform", async () => {
    let wrapper: HTMLElement | undefined;
    render(<Popper initial="translate(10px, 10px)" onWrapper={(el) => (wrapper = el)} />);

    // Radix rewrites on scroll / resize / collision flips.
    (wrapper as HTMLElement).style.transform = "translate(33.7px, 91.2px)";
    await flush();

    expect(wrapper?.style.transform).toBe("translate(34px, 91px)");
  });

  it("does not loop on its own write", async () => {
    let wrapper: HTMLElement | undefined;
    render(<Popper initial="translate(5.5px, 5.5px)" onWrapper={(el) => (wrapper = el)} />);
    await flush();

    // The observer fires on OUR write too. If the equality guard in snapTransform regressed, the
    // handler would keep writing forever; here we assert it settled and stayed settled.
    const settled = wrapper?.style.transform;
    const spy = vi.spyOn(wrapper as HTMLElement, "setAttribute");
    await flush();
    expect(wrapper?.style.transform).toBe(settled);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("leaves a transform it does not recognise alone", async () => {
    let wrapper: HTMLElement | undefined;
    render(<Popper initial="scale(1.02)" onWrapper={(el) => (wrapper = el)} />);
    await flush();
    // Inventing a translate here would yank the surface to the origin.
    expect(wrapper?.style.transform).toBe("scale(1.02)");
  });

  it("is inert when there is no popper wrapper (inline/anchored render)", () => {
    function Bare() {
      const snapRef = useSnappedPopper<HTMLDivElement>();
      return (
        <div
          ref={snapRef}
          data-testid="bare"
          style={{
            transform: "translate(1.5px, 1.5px)",
          }}
        />
      );
    }
    const { getByTestId } = render(<Bare />);
    expect(getByTestId("bare").style.transform).toBe("translate(1.5px, 1.5px)");
  });

  it("disconnects its observer on unmount", async () => {
    let wrapper: HTMLElement | undefined;
    const view = render(<Popper initial="translate(2px, 2px)" onWrapper={(el) => (wrapper = el)} />);
    const el = wrapper as HTMLElement;
    view.unmount();

    el.style.transform = "translate(7.6px, 7.6px)";
    await flush();
    // Still fractional: nothing is listening any more.
    expect(el.style.transform).toBe("translate(7.6px, 7.6px)");
  });
});

describe("composeRefs", () => {
  it("gives the node to both a callback ref and an object ref", () => {
    const seen: (HTMLDivElement | null)[] = [];
    const objectRef = React.createRef<HTMLDivElement>();
    function Both() {
      return (
        <div
          ref={composeRefs<HTMLDivElement>((n) => {
            seen.push(n);
          }, objectRef)}
          data-testid="both"
        />
      );
    }
    const { getByTestId, unmount } = render(<Both />);
    const node = getByTestId("both");

    expect(seen[0]).toBe(node);
    expect(objectRef.current).toBe(node);

    unmount();
    expect(seen.at(-1)).toBeNull(); // detach propagates too
  });

  it("tolerates undefined refs", () => {
    const objectRef = React.createRef<HTMLDivElement>();
    function WithGap() {
      return <div ref={composeRefs<HTMLDivElement>(undefined, objectRef, undefined)} data-testid="gap" />;
    }
    const { getByTestId } = render(<WithGap />);
    expect(objectRef.current).toBe(getByTestId("gap"));
  });
});

describe("useComposedRefs: REV-3-1", () => {
  /* A ref callback written inline gets a new identity every render, so React detaches the old one
     (calls it with null) and attaches the new one. That detach runs useSnappedPopper's cleanup, which
     disconnects the MutationObserver — so an inline composeRefs rebuilt the observer on EVERY render
     of every popper surface. These two tests are the before/after of that. */

  function Surface({ memoized, tick }: { memoized: boolean; tick: number }) {
    const snapRef = useSnappedPopper<HTMLDivElement>();
    const composed = useComposedRefs<HTMLDivElement>(snapRef);
    return (
      <div
        data-radix-popper-content-wrapper=""
        style={{
          transform: "translate(1.5px, 1.5px)",
        }}
      >
        <div ref={memoized ? composed : composeRefs<HTMLDivElement>(snapRef)} data-tick={tick} />
      </div>
    );
  }

  it("keeps one observer across re-renders when memoized", () => {
    /* Spy the PROTOTYPE, not the constructor — replacing the constructor hands back a mock with no
       .observe and the hook throws. */
    const observe = vi.spyOn(MutationObserver.prototype, "observe");
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    const { rerender } = render(<Surface memoized tick={0} />);
    const afterMount = observe.mock.calls.length;

    for (let tick = 1; tick <= 5; tick++) rerender(<Surface memoized tick={tick} />);

    expect(observe.mock.calls.length).toBe(afterMount);
    expect(disconnect).not.toHaveBeenCalled();
    observe.mockRestore();
    disconnect.mockRestore();
  });

  it("demonstrates the unmemoized case rebuilds one per render", () => {
    /* Pinned as the counter-example: if this ever stops growing, the memoization above has stopped
       being the thing under test and the guard is worthless. */
    const observe = vi.spyOn(MutationObserver.prototype, "observe");
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    const { rerender } = render(<Surface memoized={false} tick={0} />);
    const afterMount = observe.mock.calls.length;

    for (let tick = 1; tick <= 5; tick++) rerender(<Surface memoized={false} tick={tick} />);

    expect(observe.mock.calls.length).toBeGreaterThan(afterMount);
    expect(disconnect).toHaveBeenCalled();
    observe.mockRestore();
    disconnect.mockRestore();
  });

  it("still snaps after a re-render", () => {
    const { container, rerender } = render(<Surface memoized tick={0} />);
    rerender(<Surface memoized tick={1} />);
    const wrapper = container.querySelector<HTMLElement>("[data-radix-popper-content-wrapper]");
    expect(wrapper?.style.transform).toBe("translate(2px, 2px)");
  });
});

describe("snapTransform: the pure rounding", () => {
  /* Radix writes a fractional translate onto the popper wrapper; a fractional offset on a
     backdrop-filter layer rasterizes glyphs off the pixel grid and the text goes soft. */
  it("rounds a fractional translate", () => {
    expect(snapTransform("translate(188.5px, 42.25px)")).toBe("translate(189px, 42px)");
  });

  it("returns null when already integral", () => {
    /* THE re-entrancy guard: our own write retriggers the MutationObserver that called us, so an
       already-snapped value must produce no write or the loop never terminates. */
    expect(snapTransform("translate(189px, 42px)")).toBeNull();
  });

  it("handles translate3d", () => {
    expect(snapTransform("translate3d(10.6px, -3.2px, 0px)")).toBe("translate(11px, -3px)");
  });

  it("rounds negatives, normalising -0 to 0", () => {
    /* Math.round(-0.5) is -0 in JS, which stringifies to "0" — so the output is 0px, not -0px. Same
       pixel either way; pinned because the sign is easy to reintroduce by "fixing" the rounding. */
    expect(snapTransform("translate(-0.5px, -12.7px)")).toBe("translate(0px, -13px)");
  });

  it.each([
    "scale(1.02)",
    "",
  ])("ignores a transform it cannot parse: %j", (input) => {
    /* Radix hasn't positioned yet, or wrote a shape we don't recognise — inventing a translate here
       would yank the surface to the origin. */
    expect(snapTransform(input)).toBeNull();
  });
});
