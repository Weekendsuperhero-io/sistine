"use client";

import { CaretRightIcon, CheckIcon, CircleIcon } from "@phosphor-icons/react";
import { Menubar as MenubarPrimitive } from "radix-ui";
import type * as React from "react";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { useComposedRefs, useSnappedPopper } from "@/lib/snap-popper";
import { cn } from "@/lib/utils";

/**
 * A desktop-style menu bar (File, Edit, View…) on Radix Menubar: keyboard roving between menus, typeahead,
 * sub menus. The bar is bordered glass; its menus are bordered, veiled glass like DropdownMenu's, and like
 * those they render in a portal, sub menus included (a glass menu's backdrop-filter makes it the
 * containing block of a fixed-position child, so an unportaled sub menu is clipped by its parent).
 *
 * `menu-bar` is the older Sistine component of a similar name: a row of buttons, not a menu system.
 */

/* Role: the bar is bordered adaptive glass; its menus are bordered + veiled (read-through overlays). */
const BAR_ROLE = {
  border: true,
};
const MENU_ROLE = {
  border: true,
  veil: true,
};

const MENU_SURFACE =
  "z-50 overflow-hidden rounded-xl p-1 text-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";
const PLAIN_MENU = "bg-popover text-popover-foreground border";

function Menubar({
  className,
  variant = "glass",
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Root> &
  MaterialAxisProps & {
    variant?: "default" | "glass";
  }) {
  const [axes, rest] = splitAxisProps(props);
  const m = materialSurface(variant === "default" ? null : BAR_ROLE, axes);

  return (
    <MenubarPrimitive.Root
      data-slot="menubar"
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        "flex h-9 items-center gap-1 rounded-xl p-1 text-foreground",
        variant === "default" && "border bg-background",
        className,
      )}
      {...rest}
    />
  );
}

function MenubarMenu({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />;
}

function MenubarGroup({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />;
}

function MenubarPortal({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />;
}

function MenubarRadioGroup({ ...props }: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
}

function MenubarTrigger({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn(
        "flex cursor-default items-center rounded-md px-2 py-1 text-sm font-medium outline-none select-none hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  variant = "glass",
  ref,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content> &
  MaterialAxisProps & {
    variant?: "default" | "glass";
  }) {
  const [axes, rest] = splitAxisProps(props);
  const snapRef = useSnappedPopper<HTMLDivElement>();
  const composedRef = useComposedRefs<HTMLDivElement>(ref, snapRef);
  const m = materialSurface(variant === "default" ? null : MENU_ROLE, axes);

  return (
    <MenubarPortal>
      <MenubarPrimitive.Content
        ref={composedRef}
        data-slot="menubar-content"
        data-material={m?.["data-material"]}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          m?.className,
          "min-w-48 origin-(--radix-menubar-content-transform-origin)",
          MENU_SURFACE,
          variant === "default" && PLAIN_MENU,
          className,
        )}
        {...rest}
      />
    </MenubarPortal>
  );
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/menubar-item relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!",
        className,
      )}
      {...props}
    />
  );
}

function MenubarCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
}

function MenubarRadioItem({ className, children, ...props }: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  return (
    <MenubarPrimitive.RadioItem
      data-slot="menubar-radio-item"
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CircleIcon weight="fill" className="size-2" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <MenubarPrimitive.Label
      data-slot="menubar-label"
      data-inset={inset}
      className={cn("px-2 py-1.5 text-sm font-semibold data-[inset]:pl-8", className)}
      {...props}
    />
  );
}

function MenubarSeparator({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return <MenubarPrimitive.Separator data-slot="menubar-separator" className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />;
}

function MenubarShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn("ml-auto text-xs tracking-widest opacity-60 group-focus/menubar-item:text-accent-foreground", className)}
      {...props}
    />
  );
}

function MenubarSub({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <MenubarPrimitive.SubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <CaretRightIcon className="ml-auto size-4" />
    </MenubarPrimitive.SubTrigger>
  );
}

function MenubarSubContent({
  className,
  variant = "glass",
  ref,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent> &
  MaterialAxisProps & {
    variant?: "default" | "glass";
  }) {
  const [axes, rest] = splitAxisProps(props);
  const snapRef = useSnappedPopper<HTMLDivElement>();
  const composedRef = useComposedRefs<HTMLDivElement>(ref, snapRef);
  const m = materialSurface(variant === "default" ? null : MENU_ROLE, axes);

  return (
    <MenubarPortal>
      <MenubarPrimitive.SubContent
        ref={composedRef}
        data-slot="menubar-sub-content"
        data-material={m?.["data-material"]}
        className={cn(
          m?.className,
          "min-w-32 origin-(--radix-menubar-content-transform-origin)",
          MENU_SURFACE,
          variant === "default" && PLAIN_MENU,
          className,
        )}
        {...rest}
      />
    </MenubarPortal>
  );
}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
