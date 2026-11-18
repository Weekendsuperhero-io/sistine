/**
 * Button: the filled `default` variant keeps its fill visible under every material.
 *
 * It paints --primary and labels it --primary-foreground, a contrast-solved pair, then lays the page
 * material's image over the fill. It used to lay the FULL surface image (--srf-bg-image), and lustre's
 * includes a dense pigmented body and a tint wash, which covered the fill: the label, solved for
 * --primary, sat on lustre's own floor instead, white on its near-white day body (Lc 19.9) and near-black
 * on its dark night body (Lc 7.9). It now lays --srf-fill-image, which every material pins (the theme check
 * enforces it) and which is lustre's polish alone; measured after, Lc 87.9 by day and 66.5 at night.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("is lit on hover as on keyboard focus, in every variant", () => {
    for (const variant of [
      "glass",
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
    ] as const) {
      const { unmount } = render(<Button variant={variant}>Go</Button>);
      const classes = screen.getByRole("button").className.split(/\s+/);
      // Each class of the lit state on focus has its hover twin, so the two states cannot drift apart:
      // the border colour, and the line standing off the button (style, width, offset, colour).
      const focus = classes.filter((c) => /^(dark:)?focus-visible:(border-ring|outline-|glass-glow-)/.test(c));
      expect(focus.length, variant).toBeGreaterThanOrEqual(5);
      // No filled ring between the button and the line.
      expect(
        classes.filter((c) => /(focus-visible|hover):ring-/.test(c)),
        variant,
      ).toEqual([]);
      for (const c of focus) {
        expect(classes, `${variant}: ${c}`).toContain(c.replace("focus-visible:", "hover:"));
      }
      unmount();
    }
  });

  it("glows when pointed at or focused, in the filled variant alone", () => {
    for (const variant of [
      "glass",
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
    ] as const) {
      const { unmount } = render(<Button variant={variant}>Go</Button>);
      const classes = screen.getByRole("button").className.split(/\s+/);
      const glows = classes.includes("hover:glass-glow-ring") && classes.includes("focus-visible:glass-glow-ring");
      expect(glows, variant).toBe(variant === "default");
      // Never at rest: the halo is part of the lit state.
      expect(classes, variant).not.toContain("glass-glow-ring");
      unmount();
    }
    render(<Button variant="default">Go</Button>);
    // Its shadow folds the glow layer in, which is how the halo reaches a variant without the `glass` utility.
    expect(screen.getByRole("button").className).toContain("shadow-[var(--srf-shadow,var(--glass-shadow)),var(--glow-layer,0_0_0_0_transparent)]");
  });

  it("lays the material's FILL image over the default variant's fill, not its full surface", () => {
    render(<Button variant="default">Go</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("bg-primary");
    expect(cls).toContain("text-primary-foreground");
    expect(cls).toContain("[background-image:var(--srf-fill-image,var(--srf-bg-image,var(--glass-stack-bg)))]");
  });
});
