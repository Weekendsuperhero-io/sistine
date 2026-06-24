"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage, Avatar as BaseAvatar } from "../avatar";

export interface AvatarProps extends Omit<React.ComponentProps<typeof BaseAvatar>, "size"> {
  glow?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Sistine Avatar - Enhanced avatar with glassy effects
 */
export const Avatar = React.forwardRef<React.ElementRef<typeof BaseAvatar>, AvatarProps>(
  ({ className, glow = false, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-16 w-16",
    };

    return (
      <BaseAvatar
        ref={ref}
        className={cn(
          sizeClasses[size],
          glow && "ring-2 ring-(color:--glass-glow) shadow-lg shadow-(color:--glass-glow)",
          "transition duration-200",
          className,
        )}
        {...props}
      />
    );
  },
);
Avatar.displayName = "Avatar";

export { AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage };
