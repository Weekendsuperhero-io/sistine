import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Bench } from "@/app/research/energy/bench";

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
