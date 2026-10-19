/**
 * ChartContainer: one size contract, one observer, nothing at 0×0.
 *
 * The container used to hand recharts a percent-sized ResponsiveContainer with `minHeight={150}` inside
 * an `aspect-video` box. Recharts observes that div itself, the floor grew the box it was measuring, and
 * WebKit reported "ResizeObserver loop completed with undelivered notifications" every frame; a chart in
 * a hidden tab measured 0×0 and recharts warned "width(0) and height(0) of chart should be greater than
 * 0" on every pass. Now ONE observer measures a plot box the chart never sits in (it is absolute), and
 * the chart gets the measured size as numbers, which recharts renders without a second observer.
 *
 * jsdom has no layout, so the ResizeObserver is stubbed and driven by hand: each test decides what the
 * plot box measures.
 */
import { act, render } from "@testing-library/react";
import { Bar, BarChart } from "recharts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

const config = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const data = [
  {
    month: "Jan",
    value: 40,
  },
  {
    month: "Feb",
    value: 90,
  },
];

class StubObserver {
  static instances: StubObserver[] = [];
  targets: Element[] = [];
  constructor(private readonly callback: ResizeObserverCallback) {
    StubObserver.instances.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve() {}
  disconnect() {
    this.targets = [];
  }
  /** Report a size for every observed target, as the browser would after layout. */
  resize(width: number, height: number) {
    const entries = this.targets.map(
      (target) =>
        ({
          target,
          contentRect: {
            width,
            height,
          },
        }) as unknown as ResizeObserverEntry,
    );
    act(() => this.callback(entries, this as unknown as ResizeObserver));
  }
}

const original = globalThis.ResizeObserver;

beforeEach(() => {
  StubObserver.instances = [];
  globalThis.ResizeObserver = StubObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  globalThis.ResizeObserver = original;
  vi.restoreAllMocks();
});

function renderChart() {
  return render(
    <ChartContainer config={config} className="h-[300px]">
      <BarChart data={data}>
        <Bar dataKey="value" fill="var(--color-value)" />
      </BarChart>
    </ChartContainer>,
  );
}

const svg = (container: HTMLElement) => container.querySelector("svg.recharts-surface");

describe("ChartContainer sizing", () => {
  it("renders no chart before the plot box has a size", () => {
    const { container } = renderChart();
    expect(container.querySelector('[data-slot="chart-plot"]')).not.toBeNull();
    expect(svg(container)).toBeNull();
  });

  it("renders nothing at 0×0 (a chart in a hidden tab)", () => {
    const { container } = renderChart();
    StubObserver.instances[0].resize(0, 0);
    expect(svg(container)).toBeNull();
  });

  it("renders the chart at the measured size", () => {
    const { container } = renderChart();
    StubObserver.instances[0].resize(400, 225);
    const surface = svg(container);
    expect(surface).not.toBeNull();
    expect(surface?.getAttribute("width")).toBe("400");
    expect(surface?.getAttribute("height")).toBe("225");
  });

  it("keeps the last size when the box collapses to 0×0", () => {
    const { container } = renderChart();
    StubObserver.instances[0].resize(400, 225);
    StubObserver.instances[0].resize(0, 0);
    expect(svg(container)?.getAttribute("width")).toBe("400");
  });

  it("observes the plot box with exactly one observer", () => {
    const { container } = renderChart();
    StubObserver.instances[0].resize(400, 225);
    expect(StubObserver.instances).toHaveLength(1);
    expect(StubObserver.instances[0].targets).toEqual([
      container.querySelector('[data-slot="chart-plot"]'),
    ]);
    /* Recharts' percent-size detector would render this wrapper and observe it; the fixed path does not. */
    expect(container.querySelector(".recharts-responsive-container")).toBeNull();
  });

  it("never logs recharts' zero-size warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = renderChart();
    StubObserver.instances[0].resize(0, 0);
    StubObserver.instances[0].resize(400, 225);
    expect(svg(container)).not.toBeNull();
    const zeroSize = warn.mock.calls.filter(([msg]) => String(msg).includes("should be greater than 0"));
    expect(zeroSize).toEqual([]);
  });

  it("keeps the caller's height and the 150px floor on the container", () => {
    const { container } = renderChart();
    const root = container.querySelector("[data-chart]");
    expect(root).toHaveClass("h-[300px]", "min-h-[150px]", "aspect-video");
  });

  it("falls back to recharts' own percent container without ResizeObserver", () => {
    // @ts-expect-error — simulating an engine without the API
    delete globalThis.ResizeObserver;
    const { container } = renderChart();
    expect(container.querySelector(".recharts-responsive-container")).not.toBeNull();
  });
});
