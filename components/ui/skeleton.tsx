import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Role: bordered adaptive glass. */
const ROLE = {
  border: true,
};

function Skeleton({
  className,
  variant = "glass",
  shimmer = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  MaterialAxisProps & {
    variant?: "default" | "glass";
    /** Moving shimmer highlight (folded from the glass wrapper). */
    shimmer?: boolean;
  }) {
  const [axes, rest] = splitAxisProps(props);
  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default: "bg-muted animate-pulse",
    glass: "animate-pulse",
  };

  const m = materialSurface(variant === "default" ? null : ROLE, axes);

  return (
    <div
      data-slot="skeleton"
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        "rounded-md",
        variants[variant],
        shimmer &&
          "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[shimmer_2s_infinite]",
        className,
      )}
      {...rest}
    />
  );
}

export { Skeleton };
