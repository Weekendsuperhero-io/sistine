"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

type ToggleGroupVariant = "default" | "glass" | "outline";
type ToggleGroupSize = "default" | "sm" | "lg";

/* What the GROUP set, undefined where it set nothing: an item's own variant / size applies unless the group
   sets one, as in shadcn. The root used to default both, so a per-item override could never take effect. */
const ToggleGroupContext = React.createContext<{
  variant?: ToggleGroupVariant;
  size?: ToggleGroupSize;
  spacing?: number;
}>({
  spacing: 0,
});

/* Item sizes, on the same steps as the standalone Toggle; `size` used to set data-size and nothing else. */
const ITEM_SIZE: Record<ToggleGroupSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  default: "px-3 py-1",
  lg: "px-4 py-2",
};

/* Role: bordered adaptive glass. */
const ROLE = {
  border: true,
};

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    MaterialAxisProps & {
      variant?: ToggleGroupVariant;
      size?: ToggleGroupSize;
      /** Gap between items, in Tailwind spacing steps (0 = touching). */
      spacing?: number;
    }
>(({ className, variant, size, spacing = 0, children, ...props }, ref) => {
  const [axes, { style, ...rest }] = splitAxisProps(props);
  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default: "",
    glass: "rounded-md p-1",
    outline: "",
  };
  const resolved = variant ?? "glass";

  const m = materialSurface(resolved === "glass" ? ROLE : null, axes);

  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      data-slot="toggle-group"
      data-variant={resolved}
      data-size={size ?? "default"}
      data-spacing={spacing}
      data-material={m?.["data-material"]}
      /* `spacing` is a real gap now (it was written to data-spacing and nothing read it). */
      style={
        {
          "--gap": spacing,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        m?.className,
        "group/toggle-group inline-flex items-center justify-center gap-[--spacing(var(--gap))] rounded-md",
        variants[resolved],
        className,
      )}
      {...rest}
    >
      <ToggleGroupContext.Provider
        value={{
          variant,
          size,
          spacing,
        }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
});

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & {
    variant?: ToggleGroupVariant;
    size?: ToggleGroupSize;
  }
>(({ className, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);
  const itemVariant = context.variant || variant || "glass";
  const itemSize = context.size || size || "default";

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      data-slot="toggle-group-item"
      data-variant={itemVariant}
      data-size={itemSize}
      data-spacing={context.spacing}
      className={cn(
        // focus:z-10 lifts the focused item's ring above its neighbours, which would otherwise paint over it.
        "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium ring-offset-background transition-[color,background-color,box-shadow] focus:z-10 focus-visible:z-10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        ITEM_SIZE[itemSize],
        itemVariant === "outline" && "border border-input",
        // Inactive state - transparent, blends with background
        "text-muted-foreground",
        // Active state — the selected-control pair, both mode-aware tokens, so NO dark: twin (same as tabs)
        "data-[state=on]:bg-[var(--active-bg)]",
        "data-[state=on]:text-foreground",
        "data-[state=on]:shadow-[var(--active-shadow)]",
        /* Plain bg-accent/50 is correct here: a ToggleGroup ITEM paints no material of its own (only the
           group root carries glass-border), so its background-color is the top layer and nothing covers
           it. The standalone Toggle is the opposite case and needs glass-hover-accent — see toggle.tsx. */
        "hover:bg-accent/50 hover:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
