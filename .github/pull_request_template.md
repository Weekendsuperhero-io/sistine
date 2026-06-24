<!--
  ✨ Leave the "@agent pr-title" line below to have Agent auto-generate this PR's title and
  description from your diff (via the org's platform-tools / Jules workflow). When it runs, it
  replaces this whole body. Prefer to write it yourself? Delete that line and fill in the
  template below instead.
-->

@agent pr-title

## Summary

<!-- What does this PR change, and why? Link any related issues (e.g. "Closes #123"). -->

## Screenshots

<!-- For any UI change, include before/after screenshots in light AND dark mode. Delete if N/A. -->

## Registry impact

<!-- Did you touch components, blocks, hooks, lib, the theme, or registry.json? CI fails if the
     committed registry output is stale. -->

- [ ] I ran `pnpm registry:check` and committed the updated `registry.json` / `public/r/**`
- [ ] No registry items changed — N/A

## Checklist

<!-- CI enforces these; running them locally first keeps the PR green. -->

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
- [ ] Works in both light and dark mode (for UI changes)
