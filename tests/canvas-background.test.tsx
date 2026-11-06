import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasBackground } from "@/components/canvas-background";

/**
 * The animated canvas schedules its next frame AFTER drawing. Scheduled before, a frame whose draw threw
 * had already queued the next one, so the error was thrown again on every frame for as long as the page
 * stayed open. Frames are driven by hand. jsdom draws on a real 2D canvas (@napi-rs/canvas, the backend
 * jsdom 31 uses), so a healthy loop runs the component's actual drawing; only the failing case swaps in a
 * context whose drawing throws.
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
    render(<CanvasBackground animated speed={1} />);
    const frame = queue.at(-1);
    const scheduled = queue.length;
    frame?.(1000);
    expect(queue.length).toBe(scheduled + 1);
  });

  it("paints a still frame", () => {
    const { container } = render(<CanvasBackground seed="sistine" />);
    const canvas = container.querySelector("canvas");
    const ctx = canvas?.getContext("2d");
    expect(ctx).toBeTruthy();
    // Opaque colour across the frame: the corners and the centre all carry paint.
    const w = canvas?.width ?? 0;
    const h = canvas?.height ?? 0;
    for (const [x, y] of [
      [
        1,
        1,
      ],
      [
        w - 2,
        1,
      ],
      [
        Math.floor(w / 2),
        Math.floor(h / 2),
      ],
      [
        1,
        h - 2,
      ],
      [
        w - 2,
        h - 2,
      ],
    ]) {
      const [r, g, b, a] = ctx?.getImageData(x, y, 1, 1).data ?? [];
      expect(a, `alpha at ${x},${y}`).toBe(255);
      expect(r + g + b, `colour at ${x},${y}`).toBeGreaterThan(0);
    }
  });
});
