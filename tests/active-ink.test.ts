/**
 * The selected-control INK and the lit row's icon: each state that paints a fill inks its text and icons
 * with a token tied to that fill, so a consumer that moves the fill (a dark chip by day, a light one at
 * night) moves the ink with it, while Sistine on its own renders exactly what it did.
 *
 *   - Every --active-bg fill (the active tab, a pressed toggle, an on toggle-group item, the menus' open
 *     trigger) inks with text-active-foreground by day and dark:text-active-foreground-strong at night,
 *     never text-foreground: on a dark chip that was dark on dark (APCA Lc 13.5 in HERO's measure).
 *     Both read the consumer token --active-foreground, which the theme does NOT declare, and fall back
 *     to the ink those controls drew before: --foreground by day, --foreground-strong at night.
 *   - Every highlighted menu row (a state that paints bg-accent on a row whose icons are muted) gives its
 *     icons the row's ink (currentColor, the --accent-foreground the row already says): a muted icon on a
 *     lit row read Lc ~0.
 *   - The ghost Button's night hover is the accent at --ghost-hover-a, which the theme does not declare
 *     either and which falls back to 0.5, the half wash it was.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { computedVars, html, presetNames } from "./theme-cascade";

const read = (p: string) => readFileSync(p, "utf8");
const UI = "components/ui";
/** Each component's source with comments removed, so a class named in prose is not read as one in use. */
const sources = readdirSync(UI)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({
    file: f,
    src: read(join(UI, f))
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1"),
  }));
/* Split on whitespace and the string delimiters, not on `'`: a class may carry one ([class*='text-']). */
const classes = (src: string) => new Set(src.split(/[\s"`]+/).filter(Boolean));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("the selected-control fill inks with its own token", () => {
  /* The state prefixes that paint the fill, per file (dark: stripped: the day and night ink both follow).
     A state's ink is looked for in the whole file (Tabs and ToggleGroup say it in the next string); an
     unconditioned fill (MenuBarItem's `active &&` string) only in its own string, since the file's other
     elements carry a bare text-foreground of their own. */
  const fills = sources.flatMap(({ file, src }) =>
    [
      ...src.matchAll(/"[^"]*"/g),
    ].flatMap(([str]) =>
      [
        ...str.matchAll(/(?<=^|[\s"])([^\s"]*?)bg-\[var\(--active-bg\)\](?=[\s"])/g),
      ].map((m) => {
        const state = m[1].replace(/^dark:/, "");
        return {
          file,
          src: state ? src : str,
          state,
        };
      }),
    ),
  );

  it("finds the fills (tabs, toggle, toggle-group, menu-bar, menubar)", () => {
    expect(
      [
        ...new Set(fills.map((f) => f.file)),
      ].sort(),
    ).toEqual([
      "menu-bar.tsx",
      "menubar.tsx",
      "tabs.tsx",
      "toggle-group.tsx",
      "toggle.tsx",
    ]);
  });

  it("each state that paints --active-bg says text-active-foreground by day and its strong twin at night", () => {
    const wrong = fills.flatMap(({ file, src, state }) => {
      const has = classes(src);
      const out: string[] = [];
      if (!has.has(`${state}text-active-foreground`)) out.push(`${file} ${state}bg-[var(--active-bg)]: no ${state}text-active-foreground`);
      if (!has.has(`dark:${state}text-active-foreground-strong`))
        out.push(`${file} ${state}bg-[var(--active-bg)]: no dark:${state}text-active-foreground-strong`);
      for (const old of [
        `${state}text-foreground`,
        `dark:${state}text-foreground-strong`,
      ])
        if (has.has(old)) out.push(`${file} ${state}bg-[var(--active-bg)]: still inks with ${old}, not the fill's own token`);
      return out;
    });
    expect(wrong).toEqual([]);
  });

  it("the theme declares no --active-foreground, so the fallback is what renders", () => {
    const declared = presetNames().flatMap((tint) =>
      [
        false,
        true,
      ]
        .filter((dark) => computedVars(html(dark, tint)).has("--active-foreground"))
        .map((dark) => `${tint} ${dark ? "dark" : "light"}`),
    );
    expect(declared).toEqual([]);
    expect(read("app/theme/engine.css")).not.toMatch(/--active-foreground\s*:/);
  });
});

describe("a highlighted menu row's icons take the row's ink", () => {
  const MUTED_ICON = "[&_svg:not([class*='text-'])]:text-muted-foreground";
  /* One row per class string: a row that mutes its icons, and the states on it that light it with the accent. */
  const rows = sources.flatMap(({ file, src }) =>
    [
      ...src.matchAll(/"[^"]*"/g),
    ]
      .map((m) => m[0])
      .filter((s) => s.includes(MUTED_ICON))
      .map((s) => ({
        file,
        has: classes(s),
        states: [
          ...new Set(
            [
              ...s.matchAll(/(?<=^|[\s"])([^\s"]+:)bg-accent(?:\/\d+)?(?=[\s"])/g),
            ].map((m) => m[1]),
          ),
        ],
      })),
  );

  it("finds the rows (command, context-menu, dropdown-menu, menubar, navigation-menu)", () => {
    expect(
      [
        ...new Set(rows.map((r) => r.file)),
      ].sort(),
    ).toEqual([
      "command.tsx",
      "context-menu.tsx",
      "dropdown-menu.tsx",
      "menubar.tsx",
      "navigation-menu.tsx",
    ]);
    expect(rows.every((r) => r.states.length > 0)).toBe(true);
  });

  it("every state that lights the row gives its muted icons currentColor", () => {
    const wrong = rows.flatMap(({ file, has, states }) =>
      states
        /* A compound state (data-[active=true]:hover:) is lit by any one of its variants' icon rules. */
        .filter((state) => !state.split(":").some((v) => v && has.has(`${v}:[&_svg:not([class*='text-'])]:text-current`)))
        .map((state) => `${file}: ${state}bg-accent leaves the icon muted (no ${state}[&_svg:not([class*='text-'])]:text-current)`),
    );
    expect(wrong).toEqual([]);
  });
});

/** Resolves the theme's imports the way a bundler would: packages by their `style` entry, the rest relative. */
async function loadStylesheet(id: string, base: string) {
  const packages: Record<string, string> = {
    tailwindcss: "node_modules/tailwindcss/index.css",
    "tw-animate-css": "node_modules/tw-animate-css/dist/tw-animate.css",
  };
  const path = packages[id] ? resolve(packages[id]) : resolve(base, id);
  return {
    path,
    base: dirname(path),
    content: read(path),
  };
}

describe("compiled classes (Tailwind's own compiler over the real theme)", () => {
  it("the ink utilities fall back to today's ink, the lit icon outranks the muted one, the ghost wash to 0.5", async () => {
    const compiler = await compile(read("app/globals.css"), {
      base: resolve("app"),
      loadStylesheet,
    });
    const out = compiler.build([
      "text-active-foreground",
      "text-active-foreground-strong",
      "text-foreground",
      "[&_svg:not([class*='text-'])]:text-muted-foreground",
      "data-[selected=true]:[&_svg:not([class*='text-'])]:text-current",
      "focus:[&_svg:not([class*='text-'])]:text-current",
      "dark:hover:bg-accent/[calc(var(--ghost-hover-a,0.5)*100%)]",
    ]);
    const decl = (selector: string) => out.match(new RegExp(`${esc(selector)} \\{\\s*([^}]*?)\\s*\\}`))?.[1] ?? `${selector} not emitted`;
    // The fallbacks are the ink each control drew: text-foreground by day, text-foreground-strong at night.
    expect(decl(".text-active-foreground")).toBe("color: var(--active-foreground, var(--foreground));");
    expect(decl(".text-active-foreground-strong")).toBe("color: var(--active-foreground, var(--foreground-strong));");
    expect(decl(".text-foreground")).toBe("color: var(--foreground);");
    // The lit icon's rule names the state, so it outranks the muted rule (one more attribute or pseudo-class).
    const MUTED = String.raw`.\[\&_svg\:not\(\[class\*\=\'text-\'\]\)\]\:text-muted-foreground svg:not([class*='text-'])`;
    expect(decl(MUTED)).toBe("color: var(--muted-foreground);");
    expect(out).toMatch(/\[data-selected="true"\] svg:not\(\[class\*='text-'\]\) \{\s*color: currentcolor;/);
    expect(out).toMatch(/:focus svg:not\(\[class\*='text-'\]\) \{\s*color: currentcolor;/);
    // The ghost's night hover: the accent at --ghost-hover-a, 0.5 (the old /50) when no consumer sets it.
    expect(out).toContain("background-color: color-mix(in oklab, var(--accent) calc(var(--ghost-hover-a,0.5) * 100%), transparent);");
    expect(read("app/theme/tokens.css") + read("app/theme/engine.css")).not.toMatch(/--ghost-hover-a\s*:/);
  }, 30_000);
});
