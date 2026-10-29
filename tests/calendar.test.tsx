import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Calendar } from "@/components/ui/calendar";

describe("Calendar controlled updates", () => {
  it("preserves the day DOM and keyboard focus when the parent changes selection", () => {
    const first = new Date(2040, 5, 7);
    const second = new Date(2040, 5, 8);
    const view = render(<Calendar mode="single" defaultMonth={first} selected={first} material="lustre" />);
    const day = view.container.querySelector<HTMLButtonElement>(`button[data-day="${first.toLocaleDateString()}"]`)!;
    day.focus();
    view.rerender(<Calendar mode="single" defaultMonth={first} selected={second} material="lustre" />);
    expect(view.container.querySelector(`button[data-day="${first.toLocaleDateString()}"]`)).toBe(day);
    expect(day).toHaveFocus();
    expect(view.container.querySelector('[data-slot="calendar"]')).toHaveAttribute("data-material", "lustre");
  });

  it("still exposes next and previous month controls", () => {
    render(<Calendar defaultMonth={new Date(2040, 5, 7)} />);
    expect(
      screen.getByRole("button", {
        name: /next month/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /previous month/i,
      }),
    ).toBeInTheDocument();
  });
});
