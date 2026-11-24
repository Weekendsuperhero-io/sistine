/**
 * A badge sits flat and unblurred on what it is on.
 *
 * A badge is a pill on a card, a table row or a header: its glass cast the style's drop shadow (Lustre's is a
 * 32px blur at 30% black, a smudge under every pill in a table) and redrew a backdrop blur over a surface that
 * is blurred already. Its glass variants now carry the `flat` and `blur: false` axes (`glass-flat`,
 * `glass-unblurred`), which `glass` reads through the element's own slots (`--srf-lift`, `--srf-backdrop`)
 * ahead of the material's; `data-flat-shadow` on the page gives flat surfaces their shadow back, and `blur`
 * puts a badge's blur back where it sits over a bare scene. The CSS side is guarded by check-theme's
 * [flat-shadow]; this pins the markup.
 */
import { cleanup as cleanupDom, render } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";
import { glassMaterial, materialSurface, splitAxisProps } from "@/lib/material";

const badge = (ui: React.ReactElement) => {
  const { container } = render(ui);
  const element = container.querySelector('[data-slot="badge"]');
  if (!element) throw new Error("no badge");
  return element;
};

describe("the flat and blur axes", () => {
  it("emit one class each, and only when they change the surface", () => {
    expect(
      glassMaterial({
        flat: true,
        blur: false,
      }).className.split(" "),
    ).toEqual([
      "glass",
      "glass-flat",
      "glass-unblurred",
    ]);
    // `blur` is on unless it is `false`: true and unset both leave the backdrop to the material.
    expect(
      glassMaterial({
        blur: true,
      }).className,
    ).toBe("glass");
    expect(glassMaterial({}).className).toBe("glass");
  });

  it("let an instance override its role", () => {
    const role = {
      border: true,
      flat: true,
      blur: false,
    };
    expect(materialSurface(role, {})?.className).toBe("glass glass-border glass-flat glass-unblurred");
    expect(
      materialSurface(role, {
        blur: true,
        flat: false,
      })?.className,
    ).toBe("glass glass-border");
  });

  it("come off the props with the other axes", () => {
    const [axes, rest] = splitAxisProps({
      flat: true,
      blur: false,
      id: "x",
    });
    expect(axes).toMatchObject({
      flat: true,
      blur: false,
    });
    expect(rest).toEqual({
      id: "x",
    });
  });
});

describe("Badge", () => {
  it.each([
    "glass",
    "secondary",
    "destructive",
  ] as const)("%s is flat and unblurred", (variant) => {
    const element = badge(<Badge variant={variant}>Pill</Badge>);
    expect(element).toHaveClass("glass", "glass-flat", "glass-unblurred");
  });

  it("is a flat, unblurred glass pill with no variant at all", () => {
    expect(badge(<Badge>Pill</Badge>)).toHaveClass("glass-flat", "glass-unblurred");
  });

  it("takes its blur back with `blur`, and stays flat", () => {
    const element = badge(<Badge blur>Over the scene</Badge>);
    expect(element).toHaveClass("glass-flat");
    expect(element).not.toHaveClass("glass-unblurred");
    expect(element.getAttribute("blur")).toBeNull();
  });

  it("is raised with `flat={false}`, whatever the page asks", () => {
    const element = badge(<Badge flat={false}>Raised</Badge>);
    expect(element).not.toHaveClass("glass-flat");
    expect(element.getAttribute("flat")).toBeNull();
  });

  it("gives the primary pill the page's raise, which its flat axis and a consumer's shadow class replace", () => {
    // Not glass, so its small shadow is a page value (--pill-raise: none unless data-flat-shadow raises pills).
    const plain = badge(<Badge variant="default">Primary</Badge>).className.split(" ");
    expect(plain).toContain("shadow-(--pill-raise)");
    expect(plain).not.toContain("shadow");
    cleanupDom();
    const raised = badge(
      <Badge variant="default" flat={false}>
        Raised
      </Badge>,
    ).className.split(" ");
    expect(raised).toContain("shadow");
    expect(raised).not.toContain("shadow-(--pill-raise)");
    cleanupDom();
    const flat = badge(
      <Badge variant="default" flat>
        Flat
      </Badge>,
    ).className.split(" ");
    expect(flat).toContain("shadow-none");
    expect(flat).not.toContain("shadow-(--pill-raise)");
    cleanupDom();
    // A consumer's own shadow class still wins, as it did when the variant's was a plain `shadow`.
    const own = badge(
      <Badge variant="default" className="shadow-lg">
        Own
      </Badge>,
    ).className.split(" ");
    expect(own).toContain("shadow-lg");
    expect(own).not.toContain("shadow-(--pill-raise)");
  });

  it.each([
    "outline",
    "ghost",
    "link",
  ] as const)("%s has no glass, so neither axis", (variant) => {
    const element = badge(<Badge variant={variant}>Plain</Badge>);
    expect(element).not.toHaveClass("glass");
    expect(element).not.toHaveClass("glass-flat");
    expect(element).not.toHaveClass("glass-unblurred");
  });
});
