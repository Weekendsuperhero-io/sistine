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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

/** The variant a selected button's classes carry: pressed, current (but not "false") or switched on. */
const SELECTED = "[&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]";

const VARIANTS = [
  "glass",
  "default",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
] as const;

describe("Button", () => {
  it("is lit on hover and when selected as on keyboard focus, in every variant", () => {
    for (const variant of VARIANTS) {
      const { unmount } = render(<Button variant={variant}>Go</Button>);
      const classes = screen.getByRole("button").className.split(/\s+/);
      // The lit state on focus: the border colour, and the line standing off the button (style, width,
      // offset, colour), plus the halo where the variant has one.
      const focus = classes.filter((c) => c.startsWith("focus-visible:"));
      expect(focus.length, variant).toBeGreaterThanOrEqual(5);
      for (const c of focus) {
        // Its hover twin and its SELECTED twin, so the three states cannot drift apart.
        expect(classes, `${variant}: ${c}`).toContain(c.replace("focus-visible:", "hover:"));
        expect(classes, `${variant}: ${c}`).toContain(c.replace("focus-visible:", `${SELECTED}:`));
      }
      // No filled ring between the button and the line, and nothing hiding an outline at rest: the
      // glow utilities draw theirs there.
      expect(
        classes.filter((c) => /(focus-visible|hover):ring-/.test(c)),
        variant,
      ).toEqual([]);
      expect(classes, variant).not.toContain("outline-hidden");
      unmount();
    }
  });

  it("lights each variant in its own colour", () => {
    const light = (variant: (typeof VARIANTS)[number]) => {
      const { unmount } = render(<Button variant={variant}>Go</Button>);
      const own = screen
        .getByRole("button")
        .className.split(/\s+/)
        .filter((c) => c.startsWith("[--lit:"));
      unmount();
      return own;
    };
    // One --lit each: the variant's wins the merge over the base's.
    expect(light("default")).toEqual([
      "[--lit:var(--primary)]",
    ]);
    expect(light("destructive")).toEqual([
      "[--lit:var(--destructive)]",
    ]);
    for (const variant of [
      "glass",
      "outline",
      "secondary",
      "ghost",
      "link",
    ] as const) {
      expect(light(variant), variant).toEqual([
        "[--lit:var(--glass-glow-line)]",
      ]);
    }
  });

  it("glows when lit, in the filled variant alone, and never at rest", () => {
    for (const variant of VARIANTS) {
      const { unmount } = render(<Button variant={variant}>Go</Button>);
      const classes = screen.getByRole("button").className.split(/\s+/);
      const glows =
        classes.includes("hover:glass-glow-lit") &&
        classes.includes("focus-visible:glass-glow-lit") &&
        classes.includes(`${SELECTED}:glass-glow-lit`);
      expect(glows, variant).toBe(variant === "default");
      expect(
        classes.filter((c) => /^glass-glow/.test(c)),
        variant,
      ).toEqual([]);
      unmount();
    }
    render(<Button variant="default">Go</Button>);
    // Its shadow folds the lit edge and the glow layer in, which is how both reach a variant without the
    // `glass` utility.
    expect(screen.getByRole("button").className).toContain(
      "shadow-[var(--twin-shadow),var(--lit-layer,0_0_0_0_transparent),var(--glow-layer,0_0_0_0_transparent)]",
    );
  });

  it("rings its own edge in its light when lit, in every variant, borderless or not", () => {
    // The border takes --lit only where the variant has one; the ring (--lit-layer, 1px in --lit) outlines
    // every variant, glass, filled, ghost and link included, without changing its size. Its hover and
    // selected twins are held by the first test.
    const RING = "focus-visible:[--lit-layer:0_0_0_1px_var(--lit)]";
    for (const variant of VARIANTS) {
      const { unmount } = render(<Button variant={variant}>Go</Button>);
      const classes = screen.getByRole("button").className.split(/\s+/);
      expect(classes, variant).toContain(RING);
      // Folded into the shadow: by the `glass` utility for the surface variants, by their own shadow for the
      // three without one.
      if (variant === "ghost" || variant === "link") expect(classes, variant).toContain("shadow-[var(--lit-layer,0_0_0_0_transparent)]");
      unmount();
    }
    const utilities = readFileSync(join(process.cwd(), "app/theme/utilities.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const glass = utilities.match(/@utility glass \{[^}]*?box-shadow:([^;]+);/)?.[1].replace(/\s+/g, " ") ?? "";
    expect(glass).toContain("var(--lit-layer, 0 0 0 0 transparent)");
    // The glow rings the edge too, in the line's colour, ahead of its halo: a glowing button is outlined at rest.
    for (const name of [
      "glass-glow",
      "glass-glow-lg",
    ]) {
      const layer = utilities
        .match(new RegExp(`@utility ${name} \\{\\s*--glow-layer:([^;]+);`))?.[1]
        .replace(/\s+/g, " ")
        .trim();
      expect(layer, name).toMatch(/^0 0 0 1px var\(--glow-line, var\(--glass-glow-line\)\),/);
    }
  });

  it("wears the glow at rest when given it, line and halo", () => {
    render(<Button effect="glow">Go</Button>);
    const classes = screen.getByRole("button").className.split(/\s+/);
    expect(classes).toContain("glass-glow");
    expect(classes).toContain("hover:glass-glow-lg");
  });

  it("wears the other mode's glass, the twin, in the default variant", () => {
    // The flat --primary fill with the page material laid over it read as a plain block in every theme. The
    // filled action now wears the TWIN (tokens.css / engine.css --twin-*, tests/twin.test.ts): its fill, its
    // own ink, a rim, a top gloss and the twin's shadow, and no page material over it, which would bury it.
    render(<Button variant="default">Go</Button>);
    const classes = screen.getByRole("button").className.split(/\s+/);
    for (const c of [
      "bg-[var(--twin-bg)]",
      "text-[color:var(--twin-fg)]",
      "border-[color:var(--twin-rim)]",
      "[background-image:linear-gradient(to_bottom,oklch(100%_0_0/var(--twin-gloss-a)),transparent_55%)]",
    ])
      expect(classes).toContain(c);
    expect(classes.join(" ")).not.toMatch(/bg-primary|text-primary-foreground|--srf-fill-image/);
  });
});
