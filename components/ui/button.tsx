import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type MaterialAxisProps, type MaterialProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/* HOVER, keyboard FOCUS and SELECTED are one look, the LIT state: the button's border takes its own
   light and a 2px line in that light stands 3px off it, with the gap left open so the line reads as
   a sharp edge, not a thick band. It is the line the glow utilities draw (theme/utilities.css), and it
   replaces the 3px `ring` buttons drew on focus, which filled the gap.
   The light is --lit, the button's OWN colour: the theme's glow colour (--glass-glow-line, which
   follows a scoped tint) for the glass variants, the fill for the filled one, the status colour for
   the destructive one. Each variant sets it; a consumer may set it on the button.
   Every focus-visible class has its hover and selected twins (tests/button.test.tsx holds them
   together). Tailwind emits `hover:` only where the device can hover, so a touch leaves nothing behind,
   and a disabled button takes no pointer events.
   SELECTED is a button that says it is the chosen one: `aria-pressed="true"`, `aria-current` (any value
   but "false": the current page, step or item), or Radix's `data-state="on"`. It stays lit while it is
   so. `aria-selected` is left out on purpose: it marks cells of a grid or listbox (the calendar's days),
   packed too tightly for a line standing 3px off each.
   No `outline-hidden` at rest: an unfocused button has no outline of its own, and the glow utilities
   (the `glow` prop, `effect="glow"`) must be free to draw theirs.

   SEMANTIC variants only — each carries BEHAVIOR (text, hover, press shadows); the SURFACE comes from
   the material system (materialSurface below). The materials (lib/material.ts) + axes are the material/border/veil/
   gradient/glow/sheen props, not variants. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 [--lit:var(--glass-glow-line)] focus-visible:border-(color:--lit) focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-(color:--lit) hover:border-(color:--lit) hover:outline-solid hover:outline-2 hover:outline-offset-[3px] hover:outline-(color:--lit) [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:border-(color:--lit) [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:outline-solid [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:outline-2 [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:outline-offset-[3px] [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:outline-(color:--lit) aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.96] active:transition-transform",
  {
    variants: {
      variant: {
        glass: "text-foreground hover:opacity-90 transition active:opacity-80 active:shadow-[var(--press-shadow-strong)]",
        /* The one FILLED action (better-colors: one primary per view, colour on the background not the
           label). It now follows the page material: --srf-bg-image / --srf-shadow are inherited custom
           properties that styles.css sets on <html> per [data-glass] and materials.css sets on any
           [data-material] ancestor, so reading them with the glass stack as fallback makes this button
           wear crystal / chakra / opaque like everything else. It previously hardcoded var(--glass-bg)
           and var(--glass-shadow), pinning the GLASS sheet no matter what the page was wearing.
           The FILL stays --primary/--primary-foreground rather than moving to the gradient accent: that
           pair is contrast-solved (measured worst Lc 87.4 light / 60.9 dark across all 17 presets),
           where the gradient sits at L 60–68 — a mid-tone where text of EITHER polarity runs out of
           room. Measured worst there was Lc 55.5 with text-foreground and no better with any other
           tier or alpha, against an ARC Bronze body floor of 60.
           It deliberately does NOT take the `glass` utility: that utility writes background-color, which
           would override bg-primary and leave the fill fighting it for nothing.
           Over the fill it wears --srf-fill-image, not the full --srf-bg-image: every material pins both,
           and they are the same but for LUSTRE, whose dense pigmented body (and tint wash) covered the
           fill, so the label, solved for --primary, sat on lustre's own floor instead: white on its
           near-white day body, near-black on its dark night body. Lustre's fill image is its polish alone.
           It is also the one variant that GLOWS when lit: its shadow folds in --glow-layer as the
           `glass` utility's does (this variant does not take that utility), and `glass-glow-lit` fills
           it on hover, focus and when selected with a halo in --lit, its fill colour, so the halo reads
           as cast by the line. At rest the layer is empty. One lit action per view; the other variants
           take the line alone unless they are given the glow. */
        default:
          "bg-primary text-primary-foreground [background-image:var(--srf-fill-image,var(--srf-bg-image,var(--glass-stack-bg)))] shadow-[var(--srf-shadow,var(--glass-shadow)),var(--glow-layer,0_0_0_0_transparent)] [--lit:var(--primary)] hover:glass-glow-lit focus-visible:glass-glow-lit [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:glass-glow-lit hover:brightness-105 dark:hover:brightness-95 transition active:opacity-90 active:shadow-[var(--press-shadow)]",
        destructive:
          "text-destructive border border-destructive/60 hover:opacity-90 transition active:opacity-80 [--lit:var(--destructive)] active:shadow-[var(--press-shadow-strong)]",
        outline:
          /* No hover border of its own: the base colours this variant's 2px border with --lit when lit, and a
           variant-level hover border would win the merge and split the looks. */
          "text-foreground border-2 border-foreground/20 dark:border-white/40 dark:text-white transition active:border-foreground/50 active:shadow-[var(--press-shadow-sm)]",
        secondary: "text-foreground hover:opacity-90 transition active:opacity-80 active:shadow-[var(--press-shadow-strong)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 active:bg-accent/80 dark:active:bg-accent/60 active:shadow-[var(--press-shadow-sm)]",
        link: "text-primary underline-offset-4 hover:underline active:opacity-80",
      },
      size: {
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "glass",
      size: "default",
    },
  },
);

/* Each semantic variant's surface role: glass = borderless adaptive glass; destructive/outline the
   same (their chrome is their own border); secondary a bordered surface; default/ghost/link render no
   glass surface. */
const SURFACE_ROLE: Record<string, MaterialProps | null> = {
  glass: {},
  destructive: {},
  outline: {
    size: "sm",
  },
  secondary: {
    border: true,
  },
  /* null = no `glass` utility, deliberately (see the variant above: it would overwrite bg-primary's
     background-color). `default` still tracks the page material, but through the INHERITED --srf-*
     tokens rather than the utility. The trade is that a per-instance material prop does not apply to
     this one variant — it follows the page, not the button. */
  default: null,
  ghost: null,
  link: null,
};

function Button({
  className,
  variant = "glass",
  size = "default",
  asChild = false,
  effect,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  } & MaterialAxisProps & {
    effect?: HoverEffect;
  }) {
  const Comp = asChild ? SlotPrimitive.Slot : "button";

  const [axes, rest] = splitAxisProps(props);
  const m = materialSurface(SURFACE_ROLE[variant ?? "glass"] ?? null, axes);

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-material={m?.["data-material"]}
      data-glass-tint={variant === "destructive" ? "destructive" : undefined}
      className={cn(
        m?.className,
        buttonVariants({
          variant,
          size,
        }),
        effect &&
          hoverEffects({
            hover: effect,
          }),
        className,
      )}
      {...rest}
    />
  );
}

export { Button, buttonVariants };
