"use client";

import { CheckIcon, DiamondIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STYLES = [
  {
    value: "glass",
    label: "Glass",
  },
  {
    value: "frosted",
    label: "Frosted",
  },
  {
    value: "fluted",
    label: "Fluted",
  },
  {
    value: "crystal",
    label: "Crystal",
  },
  {
    value: "opaque",
    label: "Opaque",
  },
] as const;

type GlassStyle = (typeof STYLES)[number]["value"];

const STORAGE_KEY = "sistine-glass-style";

function applyStyle(style: GlassStyle) {
  if (style === "glass") {
    delete document.documentElement.dataset.glass;
  } else {
    document.documentElement.dataset.glass = style;
  }
}

/**
 * Re-skins every default glass surface (glass-bg / glass-surface) across the site as
 * the chosen style via a `data-glass` attribute on <html> — handy for previewing each
 * look. The CSS overrides live in globals.css; this just toggles the attribute.
 */
export function GlassStyleSwitcher() {
  const [style, setStyle] = React.useState<GlassStyle>("glass");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as GlassStyle | null;
    if (stored && STYLES.some((s) => s.value === stored)) {
      applyStyle(stored);
      setStyle(stored);
    }
  }, []);

  const choose = (next: GlassStyle) => {
    setStyle(next);
    applyStyle(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="glass" size="icon" className="h-9 w-9" aria-label="Glass style" title="Glass style">
          <DiamondIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {STYLES.map((s) => (
          <DropdownMenuItem key={s.value} onClick={() => choose(s.value)} className="justify-between gap-4">
            {s.label}
            {style === s.value && <CheckIcon className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
