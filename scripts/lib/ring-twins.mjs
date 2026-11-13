/**
 * The focus ring's NIGHT TWIN, read from a component's source: every soft day ring (`<variants>ring-ring/50`)
 * must carry its full-alpha night twin (`dark:<variants>ring-ring`) in the SAME class string, so the twin
 * applies to the element the day ring does. Checked per occurrence, not per file: one twin elsewhere in the
 * file (another element, another variant) does not cover a day ring that has none beside it.
 *
 * Shared by scripts/check-contrast.mjs (which scores the night ring at the alpha this finds) and
 * tests/readability.test.ts (which pins the twins), so the two cannot read the source differently.
 */

/** A string literal in the source: "…", '…' or `…` (a class string, a cva variant, a cn() argument). */
const LITERAL = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g;
/** A soft day ring, with its variant prefix (`focus-visible:`, `has-[…]:`, or none). */
const DAY_RING = /^((?:[^\s]*?:)?)ring-ring\/50$/;

/**
 * @param {string} src a component's source
 * @returns {{ found: number, missing: string[] }} how many soft day rings it draws, and each one whose class
 *   string has no `dark:` twin, as `<class string> :: <day ring>`
 */
export function ringTwins(src) {
  let found = 0;
  /** @type {string[]} */
  const missing = [];
  for (const m of src.matchAll(LITERAL)) {
    const classes = (m[1] ?? m[2] ?? m[3] ?? "").split(/\s+/).filter(Boolean);
    for (const cls of classes) {
      const day = DAY_RING.exec(cls);
      if (!day || day[1].startsWith("dark:")) continue;
      found += 1;
      if (!classes.includes(`dark:${day[1]}ring-ring`)) missing.push(`${cls} (no dark:${day[1]}ring-ring beside it)`);
    }
  }
  return { found, missing };
}
