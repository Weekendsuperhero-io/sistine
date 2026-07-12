import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { type MaterialAxisProps, type MaterialProps, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
const inputVariants = cva("", {
  variants: {
    variant: {
      default: "dark:bg-input/30 border-input bg-transparent shadow-xs",
      glass: "",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

/* Role: bordered adaptive glass at the small blur tier. */
const ROLE: MaterialProps = {
  border: true,
  size: "sm",
};

function Input({
  className,
  type,
  variant = "glass",
  material,
  border,
  veil,
  gradient,
  glow,
  sheen,
  diffuse,
  stained,
  icon,
  error,
  ...props
}: React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants> &
  MaterialAxisProps & {
    /** Leading icon (folded from the glass wrapper). */
    icon?: React.ReactNode;
    /** Destructive border + focus ring (folded from the glass wrapper). */
    error?: boolean;
  }) {
  const m = materialSurface(variant === "default" ? null : ROLE, {
    material,
    border,
    veil,
    gradient,
    glow,
    sheen,
    diffuse,
    stained,
  });

  const input = (
    <input
      type={type}
      data-slot="input"
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        inputVariants({
          variant,
        }),
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "transition duration-200 focus-visible:scale-[1.02]",
        icon && "pl-10",
        error && "border-destructive focus-visible:ring-destructive",
        className,
      )}
      {...props}
    />
  );

  if (icon) {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">{icon}</div>
        {input}
      </div>
    );
  }

  return input;
}

export { Input };
