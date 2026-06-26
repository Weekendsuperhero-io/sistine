"use client";

import { CaretRightIcon, Check, Circle } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const contextMenuSubContentVariants = cva(
  "z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-xl p-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: "bg-popover text-popover-foreground border",
        glass: "glass-solid text-foreground",
        frosted: "glass-frosted text-foreground",
        fluted: "glass-fluted text-foreground",
        crystal: "glass-crystal text-foreground",
        opaque: "glass-opaque text-foreground",
        surface: "glass-surface text-foreground",
        solid: "glass-solid text-foreground",
      },
    },
    defaultVariants: {
      variant: "glass",
    },
  },
);

const contextMenuContentVariants = cva(
  "z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl p-1 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: "bg-popover text-popover-foreground border",
        glass: "glass-solid text-foreground",
        frosted: "glass-frosted text-foreground",
        fluted: "glass-fluted text-foreground",
        crystal: "glass-crystal text-foreground",
        opaque: "glass-opaque text-foreground",
        surface: "glass-surface text-foreground",
        solid: "glass-solid text-foreground",
      },
    },
    defaultVariants: {
      variant: "glass",
    },
  },
);

const ContextMenu = ({ ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Root>) => (
  <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
);
ContextMenu.displayName = ContextMenuPrimitive.Root.displayName;

const ContextMenuTrigger = ({ ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>) => (
  <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
);
ContextMenuTrigger.displayName = ContextMenuPrimitive.Trigger.displayName;

const ContextMenuGroup = ({ ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Group>) => (
  <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
);
ContextMenuGroup.displayName = ContextMenuPrimitive.Group.displayName;

const ContextMenuPortal = ({ ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Portal>) => (
  <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
);
ContextMenuPortal.displayName = ContextMenuPrimitive.Portal.displayName;

const ContextMenuSub = ({ ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Sub>) => (
  <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />
);
ContextMenuSub.displayName = ContextMenuPrimitive.Sub.displayName;

const ContextMenuRadioGroup = ({ ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioGroup>) => (
  <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />
);
ContextMenuRadioGroup.displayName = ContextMenuPrimitive.RadioGroup.displayName;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    data-slot="context-menu-sub-trigger"
    data-inset={inset}
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-foreground/10 focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-foreground/10 data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <CaretRightIcon className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent> & VariantProps<typeof contextMenuSubContentVariants>
>(({ className, variant = "glass", ...props }, ref) => {
  return (
    <ContextMenuPrimitive.SubContent
      ref={ref}
      data-slot="context-menu-sub-content"
      className={cn(
        contextMenuSubContentVariants({
          variant,
        }),
        className,
      )}
      {...props}
    />
  );
});
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content> & VariantProps<typeof contextMenuContentVariants>
>(({ className, variant = "glass", ...props }, ref) => {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={ref}
        data-slot="context-menu-content"
        className={cn(
          contextMenuContentVariants({
            variant,
          }),
          className,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
});
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
    variant?: "default" | "destructive";
  }
>(({ className, inset, variant = "default", ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    data-slot="context-menu-item"
    data-inset={inset}
    data-variant={variant}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-foreground/10 focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    data-slot="context-menu-checkbox-item"
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-foreground/10 focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="pointer-events-none absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
));
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    data-slot="context-menu-radio-item"
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-foreground/10 focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  >
    <span className="pointer-events-none absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    data-slot="context-menu-label"
    data-inset={inset}
    className={cn("px-2 py-1.5 text-sm font-semibold text-foreground data-[inset]:pl-8", inset && "pl-8", className)}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator ref={ref} data-slot="context-menu-separator" className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span data-slot="context-menu-shortcut" className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />;
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
