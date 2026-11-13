import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { PatternBackground } from "../components/pattern-background";

afterEach(() => vi.restoreAllMocks());

it("measures only externally and resets ownership across still/moving/resize/unmount", () => {
  let width = 0;
  let height = 0;
  const observers: {
    callback: ResizeObserverCallback;
    disconnected: boolean;
    target?: Element;
  }[] = [];
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(() => height);
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    state: (typeof observers)[number];
    constructor(callback: ResizeObserverCallback) {
      this.state = {
        callback,
        disconnected: false,
      };
      observers.push(this.state);
    }
    observe(target: Element) {
      this.state.target = target;
    }
    unobserve() {}
    disconnect() {
      this.state.disconnected = true;
    }
  } as unknown as typeof ResizeObserver;
  const fire = (includeClosed = false) =>
    act(() => {
      for (const o of observers) if (includeClosed || !o.disconnected) o.callback([], {} as ResizeObserver);
    });
  const scene = (speed: number) => (
    <StrictMode>
      <PatternBackground style="synthwave" speed={speed} />
    </StrictMode>
  );
  try {
    const view = render(scene(0));
    expect(view.container.querySelectorAll(".sw-grid")).toHaveLength(2);
    fire();
    expect(view.container.querySelector("svg.sw-flat")).toBeNull();
    width = 1440;
    height = 378;
    fire();
    expect(view.container.querySelectorAll("svg.sw-flat")).toHaveLength(2);
    const before = view.container.querySelector("svg.sw-flat path")?.getAttribute("d");
    width = 1000;
    fire();
    expect(view.container.querySelector("svg.sw-flat path")?.getAttribute("d")).not.toBe(before);
    view.rerender(scene(8));
    expect(observers.every((o) => o.disconnected)).toBe(true);
    fire(true);
    expect(view.container.querySelectorAll(".sw-grid")).toHaveLength(2);
    view.rerender(scene(0));
    expect(view.container.querySelector("svg.sw-flat")).toBeNull();
    expect(observers.filter((o) => !o.disconnected).every((o) => o.target?.classList.contains("sw-floor"))).toBe(true);
    fire();
    expect(view.container.querySelectorAll("svg.sw-flat")).toHaveLength(2);
    height = 420;
    act(() => window.dispatchEvent(new Event("resize")));
    expect(view.container.querySelector("svg.sw-flat")?.getAttribute("viewBox")).toBe("0 0 1000 420");
    view.unmount();
    expect(observers.every((o) => o.disconnected)).toBe(true);
    fire(true);
  } finally {
    globalThis.ResizeObserver = original;
  }
});
