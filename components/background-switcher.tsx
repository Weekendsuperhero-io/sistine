"use client";

import { GridFourIcon, PaletteIcon, ShuffleIcon, SparkleIcon } from "@phosphor-icons/react";
import { type BackgroundType, useBackground } from "@/components/background-provider";
import { cn } from "@/lib/utils";

const options: {
  value: BackgroundType;
  label: string;
  Icon: typeof GridFourIcon;
}[] = [
  {
    value: "grid",
    label: "Grid",
    Icon: GridFourIcon,
  },
  {
    value: "gradient",
    label: "Gradient",
    Icon: PaletteIcon,
  },
  {
    value: "canvas",
    label: "Canvas",
    Icon: SparkleIcon,
  },
];

/**
 * Compact segmented control to switch the site-wide background. Great for previewing
 * how glass components read against each backdrop.
 */
export function BackgroundSwitcher() {
  const { background, setBackground, shuffleGradient } = useBackground();

  return (
    <div
      role="group"
      aria-label="Background style"
      className="hidden items-center gap-0.5 rounded-lg border border-[var(--glass-border)] p-0.5 sm:flex"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          title={`${label} background`}
          aria-label={`${label} background`}
          aria-pressed={background === value}
          onClick={() => setBackground(value)}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            background === value ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" weight={background === value ? "fill" : "regular"} />
        </button>
      ))}
      {background === "gradient" && (
        <button
          type="button"
          title="Shuffle gradient"
          aria-label="Shuffle gradient"
          onClick={shuffleGradient}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <ShuffleIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
