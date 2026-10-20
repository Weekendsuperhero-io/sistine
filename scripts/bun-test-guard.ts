/* Preloaded by `bun test` (see bunfig.toml): this project's tests run on Vitest, so Bun's own runner
   stops here instead of reporting ~180 false failures from a test environment it never set up. */
console.error(`
  This project's tests run on Vitest, not Bun's built-in runner.

    bun run test       every suite: theme, patterns, gamut, contrast, DOM, APCA
    bun run test:dom   the DOM tests only (vitest run)
`);
process.exit(1);
