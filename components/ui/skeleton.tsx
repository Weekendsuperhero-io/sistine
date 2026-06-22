import { cn } from "@/lib/utils";

function Skeleton({
  className,
  variant = "glass",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "glass";
}) {
  const variants = {
    default: "bg-muted animate-pulse",
    glass: "glass-surface animate-pulse",
  };

  return <div data-slot="skeleton" className={cn("rounded-md", variants[variant], className)} {...props} />;
}

export { Skeleton };
