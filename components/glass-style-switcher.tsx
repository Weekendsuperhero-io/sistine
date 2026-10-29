"use client";

import { CheckIcon, DiamondIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
    value: "crystal",
    label: "Crystal",
  },
  {
    value: "lustre",
    label: "Lustre",
  },
  {
    value: "chakra",
    label: "Chakra",
  },
  {
    value: "lucite",
    label: "Lucite",
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
 * Re-skins every adaptive glass surface across the site as
 * the chosen style via a `data-glass` attribute on <html> — handy for previewing each
 * look. The CSS overrides live in globals.css; this just toggles the attribute.
 */
export function GlassStyleSwitcher() {
  const [style, setStyle] = React.useState<GlassStyle>("crystal");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = (raw === "opaque" ? "lucite" : raw) as GlassStyle | null;
      if (stored && STYLES.some((s) => s.value === stored)) {
        applyStyle(stored);
        setStyle(stored);
        if (raw === "opaque") localStorage.setItem(STORAGE_KEY, stored);
      }
    } catch {
      // The default style remains usable when storage is unavailable.
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
        <Button size="icon" aria-label="Glass style" title="Glass style">
          <DiamondIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuGroup>
          {STYLES.map((s) => (
            <DropdownMenuItem key={s.value} onClick={() => choose(s.value)} className="justify-between gap-4">
              {s.label}
              {style === s.value && <CheckIcon aria-label="Selected" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
