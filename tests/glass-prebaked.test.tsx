/**
 * Prebaked frost: the hook writes viewport offsets, the publisher sets the background variables and
 * removes them on unmount, and the material axis emits the class without leaking the prop onto the DOM.
 */
import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Card } from "@/components/ui/card";
import { syncGlassBackdrop, useGlassBackdrop, usePublishAppBackground } from "@/hooks/use-glass-backdrop";
import { glassMaterial } from "@/lib/material";

function rect(left: number, top: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + 40,
    bottom: top + 20,
    width: 40,
    height: 20,
    toJSON() {
      return {};
    },
  };
}

describe("syncGlassBackdrop", () => {
  it("writes each bubble's viewport origin into --gx and --gy", () => {
    const root = document.createElement("div");
    const bubble = document.createElement("div");
    bubble.className = "glass-prebaked";
    bubble.getBoundingClientRect = () => rect(24, 80);
    root.appendChild(bubble);
    document.body.appendChild(root);

    syncGlassBackdrop(root);

    expect(bubble.style.getPropertyValue("--gx")).toBe("24px");
    expect(bubble.style.getPropertyValue("--gy")).toBe("80px");
    root.remove();
  });

  it("includes the root when the root itself is prebaked", () => {
    const root = document.createElement("div");
    root.className = "glass-prebaked";
    root.getBoundingClientRect = () => rect(4, 6);
    document.body.appendChild(root);

    syncGlassBackdrop(root);

    expect(root.style.getPropertyValue("--gx")).toBe("4px");
    expect(root.style.getPropertyValue("--gy")).toBe("6px");
    root.remove();
  });
});

function ScrollProbe() {
  const ref = useRef<HTMLDivElement>(null);
  useGlassBackdrop(ref);
  return (
    <div ref={ref} data-testid="scroller">
      <div className="glass-prebaked" data-testid="bubble" />
    </div>
  );
}

describe("useGlassBackdrop", () => {
  const frames: FrameRequestCallback[] = [];

  afterEach(() => {
    frames.length = 0;
    vi.unstubAllGlobals();
  });

  function installFrameQueue() {
    frames.length = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  }

  function flushFrames() {
    const batch = frames.splice(0, frames.length);
    for (const cb of batch) cb(0);
  }

  it("measures on mount and again when a bubble's class arrives", async () => {
    installFrameQueue();
    const { getByTestId } = render(<ScrollProbe />);
    const bubble = getByTestId("bubble");
    bubble.getBoundingClientRect = () => rect(12, 30);

    act(() => flushFrames());
    expect(bubble.style.getPropertyValue("--gx")).toBe("12px");
    expect(bubble.style.getPropertyValue("--gy")).toBe("30px");

    bubble.getBoundingClientRect = () => rect(50, 60);
    bubble.className = "glass-prebaked rounded-lg";
    await act(async () => {
      await Promise.resolve();
    });
    act(() => flushFrames());

    expect(bubble.style.getPropertyValue("--gx")).toBe("50px");
    expect(bubble.style.getPropertyValue("--gy")).toBe("60px");
  });
});

function Publisher({ background, filter }: { background: string | null; filter?: string | null }) {
  usePublishAppBackground(background, filter);
  return null;
}

describe("usePublishAppBackground", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--app-bg-blurred");
    document.documentElement.style.removeProperty("--app-bg-filter");
  });

  it("sets the background and the frost filter, then removes both on unmount", () => {
    const view = render(<Publisher background="linear-gradient(red, blue)" filter="blur(12px) saturate(180%)" />);
    expect(document.documentElement.style.getPropertyValue("--app-bg-blurred")).toBe("linear-gradient(red, blue)");
    expect(document.documentElement.style.getPropertyValue("--app-bg-filter")).toBe("blur(12px) saturate(180%)");

    view.unmount();
    expect(document.documentElement.style.getPropertyValue("--app-bg-blurred")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--app-bg-filter")).toBe("");
  });

  it("leaves a pre-blurred image unfiltered when no filter is passed", () => {
    render(<Publisher background="url(bg.webp) center / cover" />);
    expect(document.documentElement.style.getPropertyValue("--app-bg-blurred")).toBe("url(bg.webp) center / cover");
    expect(document.documentElement.style.getPropertyValue("--app-bg-filter")).toBe("");
  });
});

describe("glassMaterial prebaked", () => {
  it("adds the class and keeps the prop off the DOM", () => {
    expect(
      glassMaterial({
        prebaked: true,
        border: true,
      }).className,
    ).toBe("glass glass-border glass-prebaked");

    const { container } = render(<Card prebaked>Body</Card>);
    const card = container.querySelector('[data-slot="card"]') as HTMLElement;
    expect(card).toHaveClass("glass-prebaked");
    expect(card.getAttribute("prebaked")).toBeNull();
  });
});
