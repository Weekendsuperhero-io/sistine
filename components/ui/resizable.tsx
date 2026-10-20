"use client";

import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import type * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";

// react-resizable-panels v4: PanelGroup → Group (sets its own flex-direction from `orientation`),
// PanelResizeHandle → Separator (carries aria-orientation). Handle styling keys off aria-[orientation].
// The Separator's aria-orientation is the LINE's, not the group's: side-by-side panels (a horizontal
// group) are divided by a VERTICAL line, so it reports "vertical". The horizontal-bar styling therefore
// keys on aria-orientation="horizontal" (a vertical group); keyed on "vertical", every side-by-side
// group drew its divider as a flat full-width bar with the grip turned sideways.
function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.Group>) {
  return <ResizablePrimitive.Group data-slot="resizable-panel-group" className={cn("flex h-full w-full", className)} {...props} />;
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-px items-center justify-center bg-[var(--glass-border)] after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="glass z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-[var(--glass-border)]">
          <DotsSixVerticalIcon className="h-2.5 w-2.5 text-foreground" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
