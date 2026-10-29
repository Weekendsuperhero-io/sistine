import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthenticationBlock } from "@/components/blocks/authentication";
import { CalendarBlock } from "@/components/blocks/calendar";
import { ForgotPasswordBlock } from "@/components/blocks/forgot-password";
import { SignupBlock } from "@/components/blocks/signup";

afterEach(() => vi.useRealTimers());

describe("Demo block navigation", () => {
  it("connects sign in to password reset", () => {
    render(<AuthenticationBlock />);
    expect(
      screen.getByRole("link", {
        name: "Forgot password?",
      }),
    ).toHaveAttribute("href", "/blocks/forgot-password");
  });
  it("connects registration to the existing sign-in page", () => {
    render(<SignupBlock />);
    expect(
      screen.getByRole("link", {
        name: "Sign in",
      }),
    ).toHaveAttribute("href", "/blocks/authentication");
  });
  it("lets installed reset blocks supply their own sign-in destination", () => {
    render(<ForgotPasswordBlock signInHref="/login" />);
    expect(
      screen.getByRole("link", {
        name: "Back to sign in",
      }),
    ).toHaveAttribute("href", "/login");
  });
});

describe("CalendarBlock static exports", () => {
  it("does not bake a date-dependent calendar into the exported HTML", () => {
    const html = renderToString(<CalendarBlock />);
    expect(html).toContain("Loading calendar");
    expect(html).not.toContain('data-slot="calendar"');
  });
  it("seeds the selected day and sample events together, even years after module load", () => {
    vi.useFakeTimers({
      toFake: [
        "Date",
      ],
    });
    vi.setSystemTime(new Date(2041, 7, 14, 12));
    render(<CalendarBlock />);
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByText("Client Call")).toBeInTheDocument();
    expect(screen.getByText("Project Review")).toBeInTheDocument();
  });
});
