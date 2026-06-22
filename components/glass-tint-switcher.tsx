"use client";

import { CheckIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// `swatch` is a deliberately-saturated preview of each tint so the menu reads clearly;
// the glass itself applies a far subtler version of the same hue.
const TINTS = [
  {
    value: "neutral",
    label: "Neutral",
    swatch: "oklch(90% 0.02 250)",
  },
  {
    value: "sistine",
    label: "Sistine",
    swatch: "linear-gradient(135deg, oklch(85% 0.09 82), oklch(80% 0.08 45), oklch(78% 0.1 245))",
  },
  {
    value: "sapphire",
    label: "Sapphire",
    swatch: "oklch(78% 0.13 255)",
  },
  {
    value: "emerald",
    label: "Emerald",
    swatch: "oklch(80% 0.13 158)",
  },
  {
    value: "amethyst",
    label: "Amethyst",
    swatch: "oklch(78% 0.13 300)",
  },
  {
    value: "rose",
    label: "Rose",
    swatch: "oklch(82% 0.12 8)",
  },
  {
    value: "amber",
    label: "Amber",
    swatch: "oklch(85% 0.13 75)",
  },
] as const;

type Tint = (typeof TINTS)[number]["value"];

const STORAGE_KEY = "sistine-glass-tint";

function applyTint(tint: Tint) {
  const root = document.documentElement;
  // Clear any inline values left by the custom picker so the preset's CSS vars take effect.
  root.style.removeProperty("--glass-tint-h");
  root.style.removeProperty("--glass-tint-c");
  root.style.removeProperty("--glass-tint-a");
  if (tint === "neutral") {
    delete root.dataset.glassTint;
  } else {
    root.dataset.glassTint = tint;
  }
}

/**
 * Recolors every glass surface across the site by toggling `data-glass-tint` on <html>
 * (the oklch tint vars + presets live in globals.css). Purely a color change — blur and
 * structure are untouched. Composes with the theme + glass-style switchers.
 */
export function GlassTintSwitcher() {
  const [tint, setTint] = React.useState<Tint>("neutral");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Tint | null;
    if (stored && TINTS.some((t) => t.value === stored)) {
      applyTint(stored);
      setTint(stored);
    }
  }, []);

  const choose = (next: Tint) => {
    setTint(next);
    applyTint(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures
    }
  };

  const active = TINTS.find((t) => t.value === tint) ?? TINTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="glass" size="icon" className="h-9 w-9" aria-label="Glass color" title="Glass color">
          <span
            className="size-4 rounded-full border border-[var(--glass-border)]"
            style={{
              background: active.swatch,
            }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {TINTS.map((t) => (
          <DropdownMenuItem key={t.value} onClick={() => choose(t.value)} className="justify-between gap-4">
            <span className="flex items-center gap-2">
              <span
                className="size-3.5 rounded-full border border-[var(--glass-border)]"
                style={{
                  background: t.swatch,
                }}
              />
              {t.label}
            </span>
            {tint === t.value && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
