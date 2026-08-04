import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Component + hook tests. The other four suite checks (`check-theme`, `check-patterns`,
 * `check-gamut`, `check-units`) are dependency-free node scripts and stay that way — this exists only
 * for the cases that genuinely need a DOM and a renderer.
 *
 * Tests live in `tests/`, NOT beside the components. `components/ui/` is the published registry tree:
 * anything sitting in it is a file a consumer could end up reading, so it stays shippable.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname.replace(/\/$/, ""),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [
      "./tests/setup.ts",
    ],
    include: [
      "tests/**/*.test.{ts,tsx}",
    ],
  },
});
