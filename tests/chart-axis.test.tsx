/**
 * The chart's axis-label styling is a CSS selector pointed at a DOM that a third-party library owns,
 * which makes it the one piece of the theme a dependency bump can silently disconnect — and did.
 *
 * Recharts 3 split the tick group: `.recharts-cartesian-axis-tick` now wraps only the tick LINE, and
 * the label moved to a sibling branch (`.recharts-cartesian-axis-tick-labels` >
 * `.recharts-cartesian-axis-tick-label` > `text`). The shipped selector was the Recharts 2 shape,
 * `.recharts-cartesian-axis-tick text`, so after the upgrade it matched nothing, every tick fell back
 * to Recharts' own `fill="#666"`, and the axes rendered grey in all 17 themes and both modes —
 * measured at APCA Lc 18.3 against a dark card, against a ~60 floor for body text.
 *
 * Nothing static could have caught that: the class name in the selector still existed, it just stopped
 * being an ancestor. So this asserts the actual contract instead — that the selector ChartContainer
 * SHIPS still selects the element Recharts RENDERS. It reads the selector out of the source rather
 * than hardcoding it, so editing the component to a broken selector fails here too.
 *
 * Recharts is rendered directly at a fixed size rather than through ChartContainer: ChartContainer
 * wraps children in ResponsiveContainer, which measures the DOM and yields nothing at jsdom's 0×0.
 */
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as React from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Pull the axis-label rule out of the shipped class string and turn it into a real CSS selector.
 * Tailwind's arbitrary-variant syntax is `[&_<selector>]:<utility>` with `_` standing in for a space.
 */
function shippedAxisLabelSelector(): string {
  const src = readFileSync(join(root, "components/ui/chart.tsx"), "utf8");
  const m = src.match(/\[&_([^\]]+)\]:fill-muted-foreground/);
  if (!m) {
    throw new Error("ChartContainer no longer has a [&_…]:fill-muted-foreground rule for axis labels. Did the axis styling move?");
  }
  return m[1].replace(/_/g, " ");
}

const data = [
  { month: "Jan", value: 40 },
  { month: "Feb", value: 90 },
];

function Chart() {
  return (
    <BarChart width={400} height={300} data={data}>
      <XAxis dataKey="month" />
      <YAxis />
      <Bar dataKey="value" />
    </BarChart>
  );
}

describe("chart axis labels", () => {
  it("renders tick labels as <text> carrying the recharts-cartesian-axis-tick-value class", () => {
    const { container } = render(<Chart />);
    const ticks = container.querySelectorAll("text.recharts-cartesian-axis-tick-value");
    // Both axes tick; the exact count depends on Recharts' tick generator, so assert presence not arity.
    expect(ticks.length).toBeGreaterThan(0);
  });

  it("is styled by the selector ChartContainer actually ships", () => {
    const { container } = render(<Chart />);
    const selector = shippedAxisLabelSelector();
    const matched = container.querySelectorAll(selector);
    expect(
      matched.length,
      `ChartContainer styles axis labels with "${selector}", but that matches nothing in the DOM Recharts renders. ` +
        `The labels will keep Recharts' default fill="#666", grey in every theme. ` +
        `Target the class on the <text> itself (.recharts-cartesian-axis-tick-value), not an ancestor.`,
    ).toBeGreaterThan(0);
  });

  it("regression: the Recharts 2 descendant shape no longer matches, which is why it had to change", () => {
    const { container } = render(<Chart />);
    // Documents the actual breakage. If a future Recharts restores this nesting, this test tells you.
    expect(container.querySelectorAll(".recharts-cartesian-axis-tick text").length).toBe(0);
  });
});
