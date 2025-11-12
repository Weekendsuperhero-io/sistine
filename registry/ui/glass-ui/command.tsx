"use client"

import * as React from "react"
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
} from "@/registry/ui/command"
import { cn } from "@/lib/utils"

export interface ChitraCommandProps extends React.ComponentProps<typeof BaseCommand> {
  glow?: boolean
}

/**
 * Glass UI Command - Enhanced command menu with glassy effects
 */
export const ChitraCommand = React.forwardRef<
  React.ElementRef<typeof BaseCommand>,
  ChitraCommandProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseCommand
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-lg shadow-purple-500/20",
        className
      )}
      {...props}
    />
  )
})
ChitraCommand.displayName = "ChitraCommand"

export {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

