/**
 * The material helpers: class output, role inheritance, and that axis props never reach the DOM.
 *
 * Every component resolves its surface through `materialSurface(role, axes)` and strips the axes with
 * `splitAxisProps`. An axis that glassMaterial ignores silently does nothing; one that splitAxisProps
 * forgets lands on the element as an unknown attribute (React warns, and `borderColor` would serialize as
 * `bordercolor="ink"`). The ink border colour is the newest axis, so it is the one pinned here end to end.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "@/components/ui/card";
import { glassMaterial, materialSurface, splitAxisProps } from "@/lib/material";

describe("glassMaterial", () => {
  it("emits the structural class plus one class per axis", () => {
    const { className } = glassMaterial({
      border: "rim",
      borderColor: "ink",
      veil: true,
      size: "lg",
    });
    expect(className.split(" ")).toEqual([
      "glass",
      "glass-border",
      "glass-border-rim",
      "glass-border-ink",
      "glass-veil",
      "glass-lg",
    ]);
  });

  it("keeps the material's own edge colour by default", () => {
    expect(
      glassMaterial({
        border: true,
      }).className,
    ).not.toContain("glass-border-ink");
    expect(
      glassMaterial({
        border: true,
        borderColor: "glass",
      }).className,
    ).not.toContain("glass-border-ink");
  });

  it("returns nothing for material none", () => {
    expect(
      glassMaterial({
        material: "none",
        border: true,
        borderColor: "ink",
      }),
    ).toEqual({
      className: "",
    });
  });
});

describe("materialSurface", () => {
  it("lets a role default the border colour", () => {
    const m = materialSurface(
      {
        border: true,
        borderColor: "ink",
      },
      {},
    );
    expect(m?.className).toContain("glass-border-ink");
  });

  it("lets an explicit prop override the role's border colour", () => {
    const m = materialSurface(
      {
        border: true,
        borderColor: "ink",
      },
      {
        borderColor: "glass",
      },
    );
    expect(m?.className).not.toContain("glass-border-ink");
  });

  it("inherits every axis the instance leaves unset", () => {
    const m = materialSurface(
      {
        border: "frame",
        veil: true,
      },
      {
        borderColor: "ink",
      },
    );
    expect(m?.className.split(" ")).toEqual([
      "glass",
      "glass-border",
      "glass-border-frame",
      "glass-border-ink",
      "glass-veil",
    ]);
  });
});

describe("splitAxisProps", () => {
  it("takes borderColor with the other axes", () => {
    const [axes, rest] = splitAxisProps({
      borderColor: "ink" as const,
      border: true,
      id: "x",
    });
    expect(axes.borderColor).toBe("ink");
    expect(rest).toEqual({
      id: "x",
    });
  });

  it("takes prebaked with the other axes", () => {
    const [axes, rest] = splitAxisProps({
      prebaked: true,
      id: "bubble",
    });
    expect(axes.prebaked).toBe(true);
    expect(rest).toEqual({
      id: "bubble",
    });
  });

  it("does not leak borderColor onto the DOM through a component", () => {
    const { container } = render(
      <Card border borderColor="ink" data-testid="card">
        Body
      </Card>,
    );
    const card = container.querySelector('[data-slot="card"]') as HTMLElement;
    expect(card).toHaveClass("glass-border", "glass-border-ink");
    expect(card.getAttribute("bordercolor")).toBeNull();
    expect(card.getAttribute("borderColor")).toBeNull();
  });
});
