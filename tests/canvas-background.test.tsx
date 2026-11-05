import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasBackground } from "@/components/canvas-background";

/**
 * The animated canvas schedules its next frame AFTER drawing. Scheduled before, a frame whose draw threw
 * had already queued the next one, so the error was thrown again on every frame for as long as the page
 * stayed open. jsdom has no 2D canvas, so the context is a stand-in whose drawing throws, and frames are
 * driven by hand.
 */
describe("CanvasBackground animation loop", () => {
  afterEach(() => vi.restoreAllMocks());

  it("stops when a frame's draw throws", () => {
    const queue: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => queue.push(cb));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const broken = new Proxy(
      {},
      {
        get: () => () => {
          throw new Error("draw failed");
        },
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(broken as unknown as CanvasRenderingContext2D);

    render(<CanvasBackground animated speed={1} />);
    // The loop is (re)started as the effect settles; drive the most recently scheduled frame.
    const frame = queue.at(-1);
    expect(frame).toBeDefined();
    const scheduled = queue.length;
    expect(() => frame?.(1000)).toThrow("draw failed");
    expect(queue.length).toBe(scheduled);
  });

  it("keeps running while frames draw", () => {
    const queue: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => queue.push(cb));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const ok = new Proxy(
      {},
      {
        get: (_target, key) =>
          key === "createLinearGradient"
            ? () => ({
                addColorStop() {},
              })
            : () => {},
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ok as unknown as CanvasRenderingContext2D);

    render(<CanvasBackground animated speed={1} />);
    const frame = queue.at(-1);
    const scheduled = queue.length;
    frame?.(1000);
    expect(queue.length).toBe(scheduled + 1);
  });
});
