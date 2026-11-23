/**
 * Where tokens.css's base rule (`:root`) and night rule (`.dark`) open, for the checks that read the light region (from
 * the base rule to the night rule) and the dark one (from the night rule on). Each rule names an inverse element beside
 * it (`[data-mode="inverse"]`, which draws the other mode on its own element: tests/mode-inverse.test.ts), so an opener
 * is `:root,` / `.dark,` and that selector, then the brace; a plain `:root {` / `.dark {` is read too.
 *
 * An opener that is not there throws: a check sliced at -1 would read one character and pass, measuring nothing.
 */
export function openAt(source, selector) {
  const escaped = selector.replace(/[.]/g, "\\.");
  const at = new RegExp(`(^|\\n)${escaped}(?:,\\s*\\[data-mode="inverse"\\][^{]*)?\\s*\\{`).exec(source);
  if (!at) throw new Error(`theme-openers: no "${selector}" rule opens in this source; if it moved, update scripts/lib/theme-openers.mjs.`);
  return at.index + at[1].length;
}

/** The light region of tokens.css: from the base rule up to the night rule. */
export const lightRegion = (source) => source.slice(openAt(source, ":root"), openAt(source, ".dark"));

/** Everything before the night rule (the base rule and what precedes it). */
export const beforeNight = (source) => source.slice(0, openAt(source, ".dark"));

/** The dark region of tokens.css: from the night rule on. */
export const darkRegion = (source) => source.slice(openAt(source, ".dark"));
