"use client";

import { CheckIcon, DiamondIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

/* The crystal gloss's SHAPE (data-gloss-shape on <html>): the bevel (a band down from the top and a
   fainter one in from the leading edge) or the frame (one band in from all four edges). Crystal and
   chakra wear the gloss, so the menu offers the shape while either is the page style; the crystal demo
   (/colors) sets the same attribute under the same key. */
export const GLOSS_SHAPES = [
  {
    value: "bevel",
    label: "Bevel",
  },
  {
    value: "frame",
    label: "Frame",
  },
] as const;
export type GlossShape = (typeof GLOSS_SHAPES)[number]["value"];
export const GLOSS_SHAPE_KEY = "sistine-gloss-shape";
const GLOSSED: ReadonlySet<GlassStyle> = new Set<GlassStyle>([
  "crystal",
  "chakra",
]);

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
  const [shape, setShape] = React.useState<GlossShape>("bevel");

  React.useEffect(() => {
    /* The shape is restored on every page, not only where the crystal demo mounts. */
    const root = document.documentElement;
    try {
      const sh: GlossShape = localStorage.getItem(GLOSS_SHAPE_KEY) === "frame" ? "frame" : "bevel";
      root.dataset.glossShape = sh;
      setShape(sh);
    } catch {
      // The bevel remains when storage is unavailable.
    }
    /* The crystal demo sets the same attribute; follow it so the menu shows what the page wears. */
    const observer = new MutationObserver(() => setShape(root.dataset.glossShape === "frame" ? "frame" : "bevel"));
    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "data-gloss-shape",
      ],
    });
    return () => observer.disconnect();
  }, []);

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

  const chooseShape = (next: string) => {
    const sh: GlossShape = next === "frame" ? "frame" : "bevel";
    setShape(sh);
    document.documentElement.dataset.glossShape = sh;
    try {
      localStorage.setItem(GLOSS_SHAPE_KEY, sh);
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
        {GLOSSED.has(style) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Gloss shape</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={shape} onValueChange={chooseShape}>
              {GLOSS_SHAPES.map((o) => (
                <DropdownMenuRadioItem key={o.value} value={o.value}>
                  {o.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
