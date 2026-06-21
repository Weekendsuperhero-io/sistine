"use client";

import { CheckCircleIcon, CircleNotchIcon, InfoIcon, WarningIcon, WarningOctagonIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Sistine Toaster - Toast notifications with glassmorphism effects
 *
 * Features:
 * - Glass background with backdrop blur
 * - Glass border and shadow effects
 * - Smooth animations and transitions
 * - Light/dark mode support
 *
 * @example
 * ```tsx
 * import { Toaster } from "@/components/ui/sonner"
 * import { toast } from "sonner"
 *
 * // Add to root layout
 * <Toaster />
 *
 * // Use in components
 * toast.success('Success!', { description: 'Your action completed' })
 * ```
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <WarningOctagonIcon className="size-4" />,
        loading: <CircleNotchIcon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:glass-bg group-[.toaster]:backdrop-blur-[var(--blur)] group-[.toaster]:border group-[.toaster]:border-[var(--glass-border)] group-[.toaster]:shadow-[var(--glass-shadow-lg)] group-[.toaster]:text-foreground",
          description: "group-[.toast]:text-current group-[.toast]:opacity-70",
          actionButton:
            "group-[.toast]:rounded-md group-[.toast]:glass-bg group-[.toast]:backdrop-blur-[var(--blur-sm)] group-[.toast]:border group-[.toast]:border-[var(--glass-border)] group-[.toast]:text-foreground group-[.toast]:hover:opacity-90",
          cancelButton:
            "group-[.toast]:rounded-md group-[.toast]:glass-bg group-[.toast]:backdrop-blur-[var(--blur-sm)] group-[.toast]:border group-[.toast]:border-[var(--glass-border)] group-[.toast]:text-muted-foreground group-[.toast]:hover:opacity-90",
          success: "group-[.toast]:border-green-500/30 group-[.toast]:text-green-600 dark:group-[.toast]:text-green-400",
          error: "group-[.toast]:border-red-500/30 group-[.toast]:text-red-600 dark:group-[.toast]:text-red-400",
          warning: "group-[.toast]:border-yellow-500/30 group-[.toast]:text-yellow-600 dark:group-[.toast]:text-yellow-400",
          info: "group-[.toast]:border-blue-500/30 group-[.toast]:text-blue-600 dark:group-[.toast]:text-blue-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
