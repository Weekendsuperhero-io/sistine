"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Command as BaseCommand,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../command";

export interface CommandProps extends React.ComponentProps<typeof BaseCommand> {
  glow?: boolean;
}

/**
 * Sistine Command - Enhanced command menu with glassy effects
 */
export const Command = React.forwardRef<React.ElementRef<typeof BaseCommand>, CommandProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseCommand ref={ref} variant={variant} className={cn(glow && "shadow-lg shadow-purple-500/20", className)} {...props} />;
  },
);
Command.displayName = "Command";

export { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut };
