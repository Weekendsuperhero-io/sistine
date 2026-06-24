"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "./button";

export function ModeToggle({ variant = "glass" }: { variant?: "default" | "glass" }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant={variant === "glass" ? "glass" : "outline"}
      size="icon"
      onClick={mounted ? () => setTheme(isDark ? "light" : "dark") : undefined}
      aria-label="Toggle theme"
    >
      {/* Cross-fade sun↔moon: both icons stay mounted (one absolute) and animate opacity + scale +
          blur on cubic-bezier(0.2,0,0,1). Dependency-free so the shipped component stays portable. */}
      <span className="relative inline-flex size-[1.2rem] items-center justify-center">
        <Sun
          className="absolute size-[1.2rem] transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{
            opacity: isDark ? 0 : 1,
            scale: isDark ? "0.25" : "1",
            filter: isDark ? "blur(4px)" : "blur(0px)",
          }}
        />
        <Moon
          className="absolute size-[1.2rem] transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{
            opacity: isDark ? 1 : 0,
            scale: isDark ? "1" : "0.25",
            filter: isDark ? "blur(0px)" : "blur(4px)",
          }}
        />
      </span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
