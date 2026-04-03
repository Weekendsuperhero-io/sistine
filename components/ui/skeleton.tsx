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
    glass: "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] animate-pulse shadow-[var(--glass-shadow-sm)]",
  };

  return <div className={cn("rounded-md", variants[variant], className)} {...props} />;
}

export { Skeleton };
