"use client";

import { CheckCircleIcon, CircleNotchIcon, InfoIcon, WarningIcon, WarningOctagonIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import * as React from "react";
import { Toaster as Sonner, type ToastClassnames } from "sonner";
import { glassMaterial } from "@/lib/material";
import { cn } from "@/lib/utils";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * sonner's `data-type` → the theme's status tint. A status toast is stamped `data-glass-tint="<tint>"`,
 * which is all it takes for the glass engine to re-resolve the toast's surface in that status hue (the
 * same blocks Alert and the destructive Button use). sonner calls the destructive status "error".
 * Default and loading toasts are not stamped, so they follow the page's tint.
 */
export const TOAST_TINT: Record<string, string> = {
  success: "success",
  error: "destructive",
  warning: "warning",
  info: "info",
};

/* Role: bordered + veiled glass at the elevated tier, like every other read-through overlay. */
const SURFACE = glassMaterial({
  border: true,
  veil: true,
  size: "lg",
});
const BUTTON = glassMaterial({
  border: true,
  size: "sm",
});

/* The layout sonner draws itself when it is styled, rebuilt in classes because the Toaster is
   `unstyled`: sonner's own stylesheet is unlayered, so with it active no Tailwind utility (the glass
   surface included) could win against it, and the theme had to carry `[data-sonner-toast]` overrides
   with !important. Unstyled, sonner keeps positioning, stacking, swiping and animation, and the look
   comes from the material system like every other component. */
const CLASS_NAMES: ToastClassnames = {
  toast: cn(
    SURFACE.className,
    "group toast flex w-(--width) items-center gap-1.5 rounded-xl p-4 text-[13px] text-foreground",
    /* A collapsed stack shows only the front toast's content; the ones behind are bare surfaces. */
    "[&[data-expanded=false][data-front=false]>*]:opacity-0",
    /* Status edge in the toast's own status hue (the stamped tint resolves --glass-tint-h here).
       `!` on the colour itself, not the --srf-border-color slot: the page styles remap that slot from
       unlayered rules that match the toast too (it carries data-glass-tint), so no utility could win. */
    "data-[glass-tint]:border-[oklch(0.7_0.18_var(--glass-tint-h)/0.3)]!",
  ),
  icon: "relative flex size-4 shrink-0 items-center justify-start ml-(--toast-icon-margin-start) mr-(--toast-icon-margin-end)",
  content: "flex min-w-0 flex-1 flex-col gap-0.5",
  title: "font-medium leading-normal",
  /* `!`: sonner colours a dark-theme description from an unlayered rule that is not gated on styling. */
  description: "font-normal leading-[1.4] text-muted-foreground!",
  actionButton: cn(
    BUTTON.className,
    "ml-(--toast-button-margin-start) mr-(--toast-button-margin-end) flex h-6 shrink-0 cursor-pointer items-center rounded-md px-2 text-xs font-medium text-foreground transition-opacity outline-hidden hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50",
  ),
  cancelButton: cn(
    BUTTON.className,
    "ml-(--toast-button-margin-start) mr-(--toast-button-margin-end) flex h-6 shrink-0 cursor-pointer items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-opacity outline-hidden hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50",
  ),
  closeButton: cn(
    BUTTON.className,
    "absolute top-0 right-(--toast-close-button-end) left-(--toast-close-button-start) z-[1] flex size-5 cursor-pointer items-center justify-center rounded-full p-0 text-foreground [transform:var(--toast-close-button-transform)] hover:opacity-90",
  ),
  success:
    "[&_[data-title]]:text-green-600 dark:[&_[data-title]]:text-green-400 [&_[data-description]]:text-green-600/80! dark:[&_[data-description]]:text-green-400/80! [&_[data-icon]]:text-green-600! dark:[&_[data-icon]]:text-green-400!",
  error:
    "[&_[data-title]]:text-red-600 dark:[&_[data-title]]:text-red-400 [&_[data-description]]:text-red-600/80! dark:[&_[data-description]]:text-red-400/80! [&_[data-icon]]:text-red-600! dark:[&_[data-icon]]:text-red-400!",
  warning:
    "[&_[data-title]]:text-yellow-600 dark:[&_[data-title]]:text-yellow-400 [&_[data-description]]:text-yellow-600/80! dark:[&_[data-description]]:text-yellow-400/80! [&_[data-icon]]:text-yellow-600! dark:[&_[data-icon]]:text-yellow-400!",
  info: "[&_[data-title]]:text-blue-600 dark:[&_[data-title]]:text-blue-400 [&_[data-description]]:text-blue-600/80! dark:[&_[data-description]]:text-blue-400/80! [&_[data-icon]]:text-blue-600! dark:[&_[data-icon]]:text-blue-400!",
};

/** Merge a consumer's classNames over ours key by key, so passing one key does not drop the rest. */
function mergeClassNames(theirs: ToastClassnames | undefined): ToastClassnames {
  if (!theirs) return CLASS_NAMES;
  const out: Record<string, string | undefined> = {
    ...CLASS_NAMES,
  };
  for (const [key, value] of Object.entries(theirs)) out[key] = cn(out[key], value);
  return out as ToastClassnames;
}

/** Stamp (or clear) each toast's status tint from its `data-type`. */
function stampTints(root: ParentNode) {
  for (const el of root.querySelectorAll<HTMLElement>("[data-sonner-toast]")) {
    const tint = TOAST_TINT[el.dataset.type ?? ""];
    if (tint) {
      if (el.dataset.glassTint !== tint) el.dataset.glassTint = tint;
    } else if (el.dataset.glassTint !== undefined) {
      delete el.dataset.glassTint;
    }
  }
}

/**
 * Sistine Toaster - toast notifications on the glass material.
 *
 * Each toast is a bordered, veiled glass surface; status toasts (success / error / warning / info) take
 * their status hue. sonner renders the toasts, so it cannot be handed per-toast attributes: an observer
 * on the toaster stamps `data-glass-tint` from each toast's `data-type`, including when a promise toast
 * settles from loading into success or error. It runs as a microtask after sonner's DOM write, so a
 * toast never paints untinted.
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
/* The toaster follows the APP's theme (next-themes, which the site's light / dark toggle drives), as
   shadcn's does; an explicit `theme` prop still wins, and without a ThemeProvider it falls back to the OS
   ("system"). It used to default to "system" outright, so sonner's data-sonner-theme tracked the OS and
   ignored the toggle: a light-mode page on a dark-mode OS got dark-theme toasts. */
const Toaster = ({ theme, toastOptions, ref, ...props }: ToasterProps) => {
  // A forced theme (next-themes' forcedTheme, e.g. a page pinned dark) wins over the stored choice, as it
  // does for the page itself; a stored "system" is resolved by sonner exactly as next-themes resolves it.
  const { theme: chosenTheme, forcedTheme } = useTheme();
  const appTheme = forcedTheme ?? chosenTheme;
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const setRef = React.useCallback(
    (node: HTMLElement | null) => {
      sectionRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [
      ref,
    ],
  );

  React.useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    stampTints(section);
    /* Only data-type is watched: our own data-glass-tint write cannot retrigger the observer. */
    const observer = new MutationObserver(() => stampTints(section));
    observer.observe(section, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "data-type",
      ],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      ref={setRef}
      theme={(theme ?? appTheme ?? "system") as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <WarningOctagonIcon className="size-4" />,
        loading: <CircleNotchIcon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        ...toastOptions,
        unstyled: true,
        classNames: mergeClassNames(toastOptions?.classNames),
      }}
      {...props}
    />
  );
};

export { Toaster };
