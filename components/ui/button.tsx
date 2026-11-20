import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type MaterialAxisProps, type MaterialProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/* HOVER, keyboard FOCUS and SELECTED are one look, the LIT state: the button's edge takes its own
   light and a 2px line in that light stands 3px off it, with the gap left open so the line reads as
   a sharp edge, not a thick band. The edge is the border's colour where the variant has a border, and
   a 1px ring (--lit-layer, folded into the button's shadow) on every variant, so a borderless one
   (glass, filled, ghost, link) is outlined too and keeps its size. It is the line the glow utilities draw (theme/utilities.css), and it
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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 [--lit:var(--glass-glow-line)] focus-visible:border-(color:--lit) focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-(color:--lit) hover:border-(color:--lit) hover:outline-solid hover:outline-2 hover:outline-offset-[3px] hover:outline-(color:--lit) focus-visible:[--lit-layer:0_0_0_1px_var(--lit)] hover:[--lit-layer:0_0_0_1px_var(--lit)] [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:[--lit-layer:0_0_0_1px_var(--lit)] [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:border-(color:--lit) [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:outline-solid [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:outline-2 [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:outline-offset-[3px] [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:outline-(color:--lit) aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.96] active:transition-transform",
  {
    variants: {
      variant: {
        glass: "text-foreground hover:opacity-90 transition active:opacity-80 active:shadow-[var(--press-shadow-strong)]",
        /* The one FILLED action (better-colors: one primary per view, colour on the background not the
           label), dressed as the OTHER mode's glass, the TWIN (tokens.css --twin-*, composed in the engine
           beside --primary): by day the deep, rich night glass with light ink; at night the pale day glass with
           dark ink. It used to be a flat --primary fill with the page material's polish laid over it, a plain
           block of colour in every theme; now it carries what glass carries (a rim, a top gloss, a lit inner
           edge and a soft shadow) and still stands apart from every surface around it, because it is the one
           surface in the opposite mode. Its colours follow the tint like every other surface, and its ink is
           its own (tests/twin.test.ts holds the pair over the APCA body floor for every preset in both modes).
           It does not take the `glass` utility: that writes the page material's background, which would bury
           the twin. Its shadow folds in the lit edge and the glow layer as the utility's does, and it GLOWS
           when lit: `glass-glow-lit` fills it on hover, focus and when selected with a halo in --lit, so the
           halo reads as cast by the line. At rest the layer is empty. One lit action per view; the other
           variants take the line alone unless they are given the glow. */
        default:
          "border border-[color:var(--twin-rim)] bg-[var(--twin-bg)] text-[color:var(--twin-fg)] [background-image:linear-gradient(to_bottom,oklch(100%_0_0/var(--twin-gloss-a)),transparent_55%)] shadow-[var(--twin-shadow),var(--lit-layer,0_0_0_0_transparent),var(--glow-layer,0_0_0_0_transparent)] [--lit:var(--primary)] hover:glass-glow-lit focus-visible:glass-glow-lit [&:is([aria-pressed=true],[aria-current]:not([aria-current=false]),[data-state=on])]:glass-glow-lit hover:brightness-105 dark:hover:brightness-95 transition active:opacity-90 active:shadow-[var(--press-shadow)]",
        destructive:
          "text-destructive border border-destructive/60 hover:opacity-90 transition active:opacity-80 [--lit:var(--destructive)] active:shadow-[var(--press-shadow-strong)]",
        outline:
          /* No hover border of its own: the base colours this variant's 2px border with --lit when lit, and a
           variant-level hover border would win the merge and split the looks. */
          "text-foreground border-2 border-foreground/20 dark:border-white/40 dark:text-white transition active:border-foreground/50 active:shadow-[var(--press-shadow-sm)]",
        secondary: "text-foreground hover:opacity-90 transition active:opacity-80 active:shadow-[var(--press-shadow-strong)]",
        /* No surface, so no glass shadow: this one carries just the lit edge. At night the hover is the accent
           at --ghost-hover-a (0.5 unless a consumer sets it; the theme declares none): a half wash suits a
           night accent a step above the surface, and a consumer whose accent is a light chip with a dark ink
           sets it to 1, since half of that is a mid-tone neither ink reads on. */
        ghost:
          "shadow-[var(--lit-layer,0_0_0_0_transparent)] hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/[calc(var(--ghost-hover-a,0.5)*100%)] active:bg-accent/80 dark:active:bg-accent/60 active:shadow-[var(--press-shadow-sm)]",
        link: "shadow-[var(--lit-layer,0_0_0_0_transparent)] text-primary underline-offset-4 hover:underline active:opacity-80",
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
  /* null = no `glass` utility, deliberately (see the variant above: the utility paints the page material,
     which would bury the twin). The trade is that a per-instance material prop does not apply to this one
     variant: it wears the twin, whatever the page or the button is given. */
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
