"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton as BaseSkeleton } from "../skeleton";

export interface SkeletonProps extends React.ComponentProps<typeof BaseSkeleton> {
  shimmer?: boolean;
}

/**
 * Sistine Skeleton - Enhanced skeleton with glassy effects and shimmer
 */
export function Skeleton({ className, variant = "glass", shimmer = true, ...props }: SkeletonProps) {
  return (
    <BaseSkeleton
      variant={variant}
      className={cn(
        shimmer &&
          "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[shimmer_2s_infinite]",
        className,
      )}
      {...props}
    />
  );
}
