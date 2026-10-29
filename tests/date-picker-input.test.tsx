import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { DatePickerInput } from "@/components/ui/date-picker-input";

describe("DatePickerInput trigger", () => {
  it("forwards disabled, identity, accessible name, and its actual button ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    const click = vi.fn();
    render(<DatePickerInput ref={ref} disabled id="start-date" aria-label="Start date" onClick={click} />);
    const trigger = screen.getByRole("button", {
      name: "Start date",
    });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("id", "start-date");
    expect(ref.current).toBe(trigger);
    fireEvent.click(trigger);
    expect(click).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not submit an enclosing form when opening the calendar", () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <DatePickerInput />
      </form>,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Pick a date",
      }),
    );
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("treats an invalid Date as an empty selection instead of throwing during formatting", () => {
    render(<DatePickerInput value={new Date("invalid")} placeholder="Choose date" />);
    expect(
      screen.getByRole("button", {
        name: "Choose date",
      }),
    ).toBeInTheDocument();
  });
});
