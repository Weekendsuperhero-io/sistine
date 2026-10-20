"use client";

import { useSearchParams } from "next/navigation";
import { PATTERN_DISCS, PATTERN_SANDS } from "@/components/background-provider";
import { PATTERN_DENSITIES, PATTERN_STYLES, PatternBackground } from "@/components/pattern-background";

/* The site chrome stays mounted under the scene (the root layout wraps every route), so it is taken out of
   view, focus and the accessibility tree, and the page cannot scroll a scrollbar into the frame. The
   provider's own background goes too: dots, grid and mesh paint over a transparent --background, so it
   showed through them, and the scene should sit on the same page base it has on the site. */
const BARE = `
html, body { overflow: hidden; }
body header, body footer, [data-sonner-toaster] { visibility: hidden; }
.glass-backdrop-layer:not([data-backdrop] *) { display: none; }
`;

function pick<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/**
 * One pattern scene, full-viewport, over everything else on the page: what `scripts/export-backgrounds.mjs`
 * photographs, and a live-wallpaper URL in its own right. The QUERY picks the scene; theme and tint are the
 * visitor's own, restored by next-themes and the tint switcher exactly as on any other page.
 *
 *   /backdrop?scene=forest&disc=left&density=medium&sand=breeze&speed=0
 *
 * Unknown or missing values fall back to the site's defaults; `speed` is the loop in seconds (0 = static).
 */
export function BackdropScene() {
  const params = useSearchParams();
  const scene = pick(params.get("scene"), PATTERN_STYLES, "moonrise");
  const speed = Number(params.get("speed") ?? 0);
  return (
    <div data-backdrop={scene} className="fixed inset-0 z-[2147483647]">
      <style>{BARE}</style>
      <PatternBackground
        style={scene}
        density={pick(params.get("density"), PATTERN_DENSITIES, "medium")}
        speed={Number.isFinite(speed) && speed > 0 ? speed : 0}
        disc={pick(params.get("disc"), PATTERN_DISCS, "right")}
        sand={pick(params.get("sand"), PATTERN_SANDS, "breeze")}
      />
    </div>
  );
}
