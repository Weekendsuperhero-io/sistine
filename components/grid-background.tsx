"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Theme-aware wallpaper.
 * Base: a soft gradient + color blobs + faint grid, so the backdrop is never blank.
 * On top (demo only): a blurred cityscape — daytime city in light mode, neon night in dark — shown
 * ONLY once the image files exist at public/backgrounds/city-day.jpg + city-night.jpg. Drop those two
 * files there and they appear automatically. Demo-only; not part of the shipped registry.
 */
export function GridBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = !mounted || resolvedTheme === "dark";
  const photo = isDark ? "/backgrounds/city-night.png" : "/backgrounds/city-day.png";

  // Only overlay the cityscape if the file is actually present; otherwise the gradient base shows.
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (active) setHasPhoto(true);
    };
    img.onerror = () => {
      if (active) setHasPhoto(false);
    };
    img.src = photo;
    return () => {
      active = false;
    };
  }, [
    photo,
  ]);

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-colors duration-500"
      style={{
        background: isDark
          ? `linear-gradient(160deg,
              oklch(0.22 0.025 260) 0%,
              oklch(0.18 0.03 268) 30%,
              oklch(0.15 0.025 275) 60%,
              oklch(0.13 0.02 280) 100%)`
          : `linear-gradient(160deg,
              oklch(0.88 0.04 250) 0%,
              oklch(0.85 0.05 260) 30%,
              oklch(0.82 0.06 270) 55%,
              oklch(0.84 0.05 255) 80%,
              oklch(0.87 0.04 245) 100%)`,
      }}
    >
      {/* Blob top-left */}
      <div
        className="absolute"
        style={{
          width: "55vw",
          height: "55vh",
          top: "-5%",
          left: "-10%",
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, oklch(0.28 0.03 280 / 0.25) 0%, transparent 70%)"
            : "radial-gradient(circle, oklch(0.82 0.08 290 / 0.5) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Blob top-right */}
      <div
        className="absolute"
        style={{
          width: "45vw",
          height: "50vh",
          top: "-5%",
          right: "-10%",
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, oklch(0.25 0.025 220 / 0.2) 0%, transparent 70%)"
            : "radial-gradient(circle, oklch(0.85 0.07 210 / 0.45) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Blob center */}
      <div
        className="absolute"
        style={{
          width: "65vw",
          height: "55vh",
          top: "25%",
          left: "15%",
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, oklch(0.23 0.025 200 / 0.2) 0%, transparent 70%)"
            : "radial-gradient(circle, oklch(0.88 0.06 240 / 0.4) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Blob bottom-left */}
      <div
        className="absolute"
        style={{
          width: "50vw",
          height: "50vh",
          bottom: "-5%",
          left: "0%",
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, oklch(0.2 0.025 300 / 0.2) 0%, transparent 70%)"
            : "radial-gradient(circle, oklch(0.8 0.08 310 / 0.4) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* Blob bottom-right */}
      <div
        className="absolute"
        style={{
          width: "50vw",
          height: "45vh",
          bottom: "-10%",
          right: "-5%",
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, oklch(0.24 0.02 240 / 0.18) 0%, transparent 70%)"
            : "radial-gradient(circle, oklch(0.83 0.06 225 / 0.35) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isDark
            ? `linear-gradient(oklch(100% 0 0 / 0.03) 1px, transparent 1px),
               linear-gradient(90deg, oklch(100% 0 0 / 0.03) 1px, transparent 1px)`
            : `linear-gradient(oklch(0% 0 0 / 0.03) 1px, transparent 1px),
               linear-gradient(90deg, oklch(0% 0 0 / 0.03) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isDark
            ? `linear-gradient(oklch(100% 0 0 / 0.015) 1px, transparent 1px),
               linear-gradient(90deg, oklch(100% 0 0 / 0.015) 1px, transparent 1px)`
            : `linear-gradient(oklch(0% 0 0 / 0.015) 1px, transparent 1px),
               linear-gradient(90deg, oklch(0% 0 0 / 0.015) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Blurred cityscape (demo) — appears once the image files are present */}
      {hasPhoto && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
            style={{
              backgroundImage: `url(${photo})`,
              filter: "blur(8px) saturate(1.05)",
              transform: "scale(1.08)", // push the blurred edges past the viewport so no gap shows
            }}
          />
          {/* Scrim so glass surfaces keep their contrast over the photo */}
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? "linear-gradient(160deg, oklch(0.14 0.03 270 / 0.5) 0%, oklch(0.11 0.02 282 / 0.62) 100%)"
                : "linear-gradient(160deg, oklch(0.93 0.03 250 / 0.42) 0%, oklch(0.85 0.05 262 / 0.52) 100%)",
            }}
          />
        </>
      )}
    </div>
  );
}
