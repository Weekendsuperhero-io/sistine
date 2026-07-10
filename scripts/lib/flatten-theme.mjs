/**
 * flattenTheme(root) — the single-file view of the theme.
 *
 * app/globals.css is an @import aggregator over app/theme/* partials. Consumers install ONE flattened
 * globals.css (the registry theme item), and check-theme's invariants parse the same flattened string —
 * so this inliner is the shared source of truth for "the theme as shipped".
 *
 * Deterministic, byte-stable string work: local relative imports (@import "./…") are inlined recursively
 * in place; package imports ("tailwindcss", "tw-animate-css") and every other line pass through verbatim.
 * No reformatting — the output is exactly the partials, concatenated in aggregator order.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const LOCAL_IMPORT = /^@import\s+"(\.\.?\/[^"]+)"\s*;\s*$/;

function inline(file, seen) {
  if (seen.has(file)) throw new Error(`flatten-theme: circular @import via ${file}`);
  seen.add(file);
  const dir = dirname(file);
  const out = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(LOCAL_IMPORT);
    if (m) {
      // Inlined partial bodies end with exactly one trailing newline; trim it so the joined
      // output keeps the aggregator's own line structure (one blank-free seam per import).
      out.push(inline(join(dir, m[1]), seen).replace(/\n$/, ""));
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

export function flattenTheme(root) {
  return inline(join(root, "app/globals.css"), new Set());
}
