import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bench } from "@/app/research/energy/bench";
import { GpuBackground } from "@/app/research/energy/gpu-backgrounds";

/**
 * The research bench (/research/energy) picks each phase's background by NAME, from the URL. Looked up on
 * a plain object, a name like "constructor" or "toString" found Object.prototype's function rather than
 * undefined, so the fallback never ran and the page threw (CodeQL: invocation of a method with a
 * user-controlled name). An unknown name has to fall back to the still background.
 */
describe("energy bench", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it.each([
    "constructor",
    "toString",
    "hasOwnProperty",
    "__proto__",
    "no-such-background",
  ])("falls back to the still background for ?order=%s", async (name) => {
    window.history.replaceState(null, "", `/research/energy?start=${Date.now() - 1000}&settle=1&measure=60&order=${name}`);
    const { container } = render(<Bench />);
    await waitFor(() => expect(screen.getByText(`1/1 · ${name}`)).toBeInTheDocument());
    expect(container.querySelector("[data-bench] canvas.glass-backdrop-layer")).not.toBeNull();
  });

  it("restores fillRect when it unmounts, so a remount counts each frame once", async () => {
    // jsdom has no CanvasRenderingContext2D; the bench only patches the prototype's fillRect, so a stand-in will do.
    const g = globalThis as {
      CanvasRenderingContext2D?: unknown;
    };
    const had = "CanvasRenderingContext2D" in g;
    class Ctx {
      fillRect() {}
    }
    g.CanvasRenderingContext2D = Ctx;
    const original = Ctx.prototype.fillRect;
    const url = () => `/research/energy?start=${Date.now() - 1000}&settle=1&measure=60&order=still&diag=1`;
    try {
      window.history.replaceState(null, "", url());
      const first = render(<Bench />);
      await waitFor(() => expect(Ctx.prototype.fillRect).not.toBe(original));
      first.unmount();
      expect(Ctx.prototype.fillRect).toBe(original);

      window.history.replaceState(null, "", url());
      const second = render(<Bench />);
      await waitFor(() => expect(Ctx.prototype.fillRect).not.toBe(original));
      const bench = window.__bench as NonNullable<typeof window.__bench>;
      bench.canvasFrames = 0;
      Ctx.prototype.fillRect.call({
        canvas: {
          isConnected: true,
        },
      });
      expect(bench.canvasFrames).toBe(1);
      second.unmount();
    } finally {
      if (!had) delete g.CanvasRenderingContext2D;
    }
  });
});

/**
 * GpuBackground schedules its next frame AFTER drawing, as CanvasBackground does: scheduled before, a frame
 * whose draw threw had already queued the next one, so the error was thrown again on every frame. jsdom has
 * no WebGL2, so the context is a stand-in good enough for the renderer to build (every call returns a truthy
 * object, so the shaders compile and the program links), and `drawArrays`, what each frame draws, is the
 * one call that can be made to throw. Frames are driven by hand.
 */
describe("GpuBackground animation loop", () => {
  afterEach(() => vi.restoreAllMocks());

  async function run(draw: () => void) {
    const gl = new Proxy({} as Record<string | symbol, unknown>, {
      get: (target, key) => (key in target ? target[key] : key === "drawArrays" ? draw : () => ({})),
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    });
    const real = HTMLCanvasElement.prototype.getContext;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type === "webgl2" ? gl : (real as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as unknown as typeof real);
    const queue: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => queue.push(cb));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    render(<GpuBackground api="webgl2" style="gradient" />);
    // The loop starts from an async setup, and is (re)started as the effect settles: drive the newest frame.
    await waitFor(() => expect(queue.length).toBeGreaterThan(0));
    return queue;
  }

  it("stops when a frame's draw throws", async () => {
    const queue = await run(() => {
      throw new Error("draw failed");
    });
    const frame = queue.at(-1);
    const scheduled = queue.length;
    expect(() => frame?.(1000)).toThrow("draw failed");
    expect(queue.length).toBe(scheduled);
  });

  it("keeps running while frames draw", async () => {
    const queue = await run(() => {});
    const frame = queue.at(-1);
    const scheduled = queue.length;
    frame?.(1000);
    expect(queue.length).toBe(scheduled + 1);
  });
});
