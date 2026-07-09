#!/usr/bin/env node
/**
 * Builds the flattened single-file theme the registry ships: app/theme/* (via the app/globals.css
 * aggregator) → registry/theme/globals.css. The artifact is byte-identical to flattenTheme() — no
 * banner — so check-theme can assert artifact === flatten === theme.json content, and consumers get a
 * clean globals.css (it lands in THEIR app, where editing is expected).
 *
 * The artifact is COMMITTED so fresh clones pass smoke-registry's files-exist check and consumer-facing
 * theme diffs stay reviewable. Runs first in `pnpm registry:build` / `registry:check` (shadcn build
 * embeds the file's content into public/r/theme.json). check-theme invariant 7b flags a stale artifact.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { flattenTheme } from "./lib/flatten-theme.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = flattenTheme(root);
mkdirSync(join(root, "registry/theme"), { recursive: true });
writeFileSync(join(root, "registry/theme/globals.css"), css);
console.log(`built registry/theme/globals.css (${css.length} bytes)`);
