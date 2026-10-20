/**
 * Field: the fixes over shadcn's version.
 *
 * - A label wrapping a Field (a choice card) lights up from the control's `data-state="checked"`;
 *   shadcn's `has-data-checked:` looked for a `data-checked` attribute no Radix control renders.
 * - A horizontal Field balances its description through `data-orientation`, which the Field sets;
 *   shadcn's `group-has-data-horizontal/field:` asked for an attribute that does not exist.
 * - FieldSeparator's label sits between two rules instead of on a `bg-background` patch, which on glass
 *   painted an opaque page-coloured block.
 * - FieldError de-duplicates messages and renders one as text, several as a list.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, FieldDescription, FieldError, FieldLabel, FieldSeparator } from "@/components/ui/field";

describe("Field", () => {
  it("styles a choice card from the Radix checked state", () => {
    render(<FieldLabel data-testid="label">Plan</FieldLabel>);
    const cls = screen.getByTestId("label").className;
    expect(cls).toContain("has-data-[state=checked]:bg-primary/5");
    expect(cls).not.toMatch(/has-data-checked:/);
  });

  it("keys the horizontal description on data-orientation", () => {
    render(
      <Field orientation="horizontal" data-testid="field">
        <FieldDescription data-testid="desc">Hint</FieldDescription>
      </Field>,
    );
    expect(screen.getByTestId("field")).toHaveAttribute("data-orientation", "horizontal");
    expect(screen.getByTestId("desc").className).toContain("group-data-[orientation=horizontal]/field:text-balance");
  });

  it("separates with two rules and no background knock-out", () => {
    const { container } = render(<FieldSeparator>or</FieldSeparator>);
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(2);
    expect(container.innerHTML).not.toContain("bg-background");
  });

  it("renders a single separator without a label", () => {
    const { container } = render(<FieldSeparator />);
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(1);
  });

  it("de-duplicates errors and renders one as text", () => {
    render(
      <FieldError
        errors={[
          {
            message: "Required",
          },
          {
            message: "Required",
          },
        ]}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Required");
    expect(alert.querySelector("ul")).toBeNull();
  });

  it("lists several distinct errors", () => {
    render(
      <FieldError
        errors={[
          {
            message: "Too short",
          },
          {
            message: "Needs a digit",
          },
        ]}
      />,
    );
    expect(screen.getByRole("alert").querySelectorAll("li")).toHaveLength(2);
  });

  it("renders nothing without errors or children", () => {
    const { container } = render(<FieldError errors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
