/**
 * The picker entries must be CLICKABLE, not keyboard-only.
 *
 * Reported 2026-08-31: selecting a skill or Library document — at session setup
 * and in the Context sheet — required pressing Enter. Clicking an entry did
 * nothing.
 *
 * The cause was a stylesheet bug wearing a behaviour bug's clothes:
 *
 *   1. cmdk renders `data-disabled={!!disabled}` on EVERY item, enabled or not.
 *   2. React stringifies booleans on `data-*` attributes, so an enabled item
 *      ships the *present* attribute `data-disabled="false"`.
 *   3. Tailwind compiles the bare `data-[disabled]:` variant to the attribute
 *      PRESENCE selector `[data-disabled]`, which matches `"false"` exactly as
 *      well as `"true"`.
 *
 * So `[data-disabled]{pointer-events:none}` applied to every entry in every
 * command list. Enter kept working — cmdk dispatches its own `cmdk-item-select`
 * event straight at the node, which never consults pointer-events — and that is
 * what disguised a CSS defect as a mouse-only quirk.
 *
 * The Radix menus next door use the same bare variant safely, because Radix
 * omits the attribute when an item is enabled. The variant is only a trap for
 * primitives that always emit it, so the guard is scoped to this file rather
 * than banned repo-wide.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command as CommandPrimitive } from "cmdk";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), "../components/ui/command.tsx");

describe("CommandItem is clickable", () => {
  // The precondition the guard below rests on. If cmdk ever starts omitting
  // the attribute for enabled items this test fails, and the guard can go.
  it('cmdk puts data-disabled="false" on an ENABLED item', () => {
    const html = renderToStaticMarkup(
      <CommandPrimitive>
        <CommandPrimitive.List>
          <CommandPrimitive.Item>Enabled</CommandPrimitive.Item>
        </CommandPrimitive.List>
      </CommandPrimitive>,
    );

    expect(html).toContain('data-disabled="false"');
  });

  // The guard. `data-[disabled]:` matches that "false" and kills the click.
  it("styles disabled state with data-[disabled=true], never the bare variant", () => {
    const source = readFileSync(SOURCE, "utf8");
    const bare = source.match(/data-\[disabled\]:[a-z0-9-]+/g) ?? [];

    expect(
      bare,
      `bare data-[disabled]: variants compile to the presence selector [data-disabled], which
matches the data-disabled="false" cmdk puts on every ENABLED item — so these would apply to
entries that are not disabled. With pointer-events-none among them, no picker entry can be
clicked. Use data-[disabled=true]: instead. Found: ${bare.join(", ")}`,
    ).toEqual([]);
  });

  // Belt and braces: whatever the spelling, the click must not be disabled for
  // an enabled row. This is the property the user actually cares about.
  it("does not disable pointer events except on a genuinely disabled item", () => {
    const source = readFileSync(SOURCE, "utf8");
    for (const variant of source.match(/\S*:pointer-events-none/g) ?? []) {
      // `[&_svg]:` is fine and deliberate — it lets a click on an icon fall
      // through to the row rather than being swallowed by the icon.
      expect(variant, `${variant} would block clicks on enabled rows`).toMatch(/^(\[&_svg\]|data-\[disabled=true\]):/);
    }
  });
});
