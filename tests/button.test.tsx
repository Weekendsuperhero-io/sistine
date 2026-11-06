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
  it("lays the material's FILL image over the default variant's fill, not its full surface", () => {
    render(<Button variant="default">Go</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("bg-primary");
    expect(cls).toContain("text-primary-foreground");
    expect(cls).toContain("[background-image:var(--srf-fill-image,var(--srf-bg-image,var(--glass-stack-bg)))]");
  });
});
