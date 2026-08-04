"use client";

import * as React from "react";

/**
 * Keeps text crisp on Radix popper surfaces (dropdown-menu, popover, tooltip, select, hover-card,
 * context-menu).
 *
 * THE DEFECT: Radix positions those surfaces by writing an inline `transform: translate(x, y)` onto a
 * wrapper element. Floating UI does not round x/y, so they land on fractions whenever the trigger does
 * — under browser zoom, fractional DPR, or any flex/grid trigger whose box isn't on a whole pixel. On
 * its own that would be harmless, but sistine's popper content carries `backdrop-filter` (it's glass),
 * which promotes it to its own compositing layer. A promoted layer at a fractional offset has its
 * glyphs rasterized off the device pixel grid and the text renders visibly soft.
 *
 * This is the same defect the dialogs had. There the fix was to stop using a transform to center; a
 * popper can't do that, because its position IS the transform. So instead: round the translate to whole
 * pixels. Sub-pixel placement is imperceptible; blurred text is not.
 *
 * Radix rewrites that transform on scroll, resize and collision flips, so a MutationObserver re-snaps
 * after each write. The observer is re-entrant — our own write retriggers it — so the write is skipped
 * when the value is already integral, which terminates the loop on the first pass.
 */
/**
 * The whole snap, as a pure string transform: given the wrapper's SPECIFIED inline `transform`, return
 * what it should be rewritten to, or `null` to leave it alone.
 *
 * Returning null is load-bearing in two cases and both are re-entrancy guards, since our own write
 * retriggers the MutationObserver that called us:
 *   - the value is already integral, so there is nothing to do and the loop terminates on pass one;
 *   - the value isn't a translate we recognise (Radix hasn't positioned yet), so we must not invent one.
 *
 * Split out of the hook so it can be checked without a DOM — see scripts/check-units.mjs.
 */
export function snapTransform(specified: string): string | null {
  const parts = /^translate(?:3d)?\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/.exec(specified);
  if (!parts) return null;
  const next = `translate(${Math.round(Number(parts[1]))}px, ${Math.round(Number(parts[2]))}px)`;
  return specified === next ? null : next;
}

export function useSnappedPopper<T extends HTMLElement>(): React.RefCallback<T> {
  const cleanupRef = React.useRef<(() => void) | null>(null);

  return React.useCallback((node: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!node) return;

    const wrapper = node.closest<HTMLElement>("[data-radix-popper-content-wrapper]");
    if (!wrapper) return; // not popper-positioned (e.g. an inline/anchored render) — nothing to snap

    const snap = () => {
      // Read and write the SPECIFIED value, never the computed one. Under browser `zoom` the computed
      // transform is in a scaled space, so rounding it and writing the result back as authored px
      // never converges — snapTransform's equality guard would never hold and the observer would
      // re-enter forever.
      const next = snapTransform(wrapper.style.transform);
      if (next !== null) wrapper.style.transform = next;
    };

    snap();
    const observer = new MutationObserver(snap);
    observer.observe(wrapper, {
      attributes: true,
      attributeFilter: [
        "style",
      ],
    });
    cleanupRef.current = () => observer.disconnect();
  }, []);
}

/**
 * Merge the forwarded ref with the snapping ref, MEMOIZED — use this, not `composeRefs`, in JSX.
 *
 * A ref callback written inline gets a fresh identity on every render, and React responds by detaching
 * the old one (calling it with `null`) and attaching the new one. For a plain ref that is merely
 * wasteful; here the detach runs `useSnappedPopper`'s cleanup, so the MutationObserver watching the
 * popper wrapper is torn down and rebuilt on every single render of the surface.
 *
 * Same shape as Radix's own `useComposedRefs` — `useCallback` over the composed callback, with the
 * refs themselves as the dependency array, so the identity holds as long as the individual refs do.
 * Kept local rather than importing @radix-ui/react-compose-refs: these components ship through the
 * registry, and a direct dependency would have to be declared on all six of them.
 */
export function useComposedRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  /* The spread refs ARE the dependency list — the identity holds while each individual ref does. */
  return React.useCallback(composeRefs(...refs), refs);
}

/** Merge the forwarded ref with the snapping ref — both need the same node. Prefer the memoized
 *  {@link useComposedRefs} anywhere the result is handed to JSX. */
export function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}
