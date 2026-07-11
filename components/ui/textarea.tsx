import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { type MaterialAxisProps, type MaterialProps, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
const textareaVariants = cva("", {
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

function Textarea({
  className,
  variant = "glass",
  material,
  border,
  veil,
  gradient,
  glow,
  sheen,
  diffuse,
  icon,
  error,
  ...props
}: React.ComponentProps<"textarea"> &
  VariantProps<typeof textareaVariants> &
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
  });

  const textarea = (
    <textarea
      data-slot="textarea"
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        textareaVariants({
          variant,
        }),
        "transition duration-200 focus-visible:scale-[1.01]",
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
        <div className="absolute left-3 top-3 text-muted-foreground">{icon}</div>
        {textarea}
      </div>
    );
  }

  return textarea;
}

export { Textarea };
