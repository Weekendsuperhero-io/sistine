/**
 * The motion token contract. A consumer (HERO's No / Slow / Go / Flow dial) sets these on :root, and
 * Sistine reads every one with a fallback EQUAL to the literal it replaced, so a consumer that sets
 * nothing sees no change:
 *   --motion-scale        duration multiplier for transitions and enter/exit
 *   --motion-loop-scale   duration multiplier for loops (spin, pulse, ping, bounce, the shimmer)
 *   --motion-ease-{standard,enter,exit,emphasized,in-out}   easing roles
 *   data-motion on :root  when present the consumer owns reduced motion ("no" = reduce); absent, the OS.
 *
 * Each failure names the file and line, so putting one literal back points at itself.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";

const THEME = "app/theme";
const TIMING_PROPS = /\b(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)\s*:\s*([^;{}]+);/g;
const TIME = /(?<![\w-])\d*\.?\d+m?s\b/;
const SCALE = /var\(--motion-(loop-)?scale, 1\)/;
/** Shorthands that name a curve take it from a role, or are a loop's linear/steps. */
const EASING = /var\(--motion-ease-(standard|enter|exit|emphasized|in-out), |\blinear\b|\bsteps\(/;

/** One rule the scale deliberately does not reach, with why. */
const EXEMPT = new Map([
  [
    "utilities.css: animation-duration: 3s",
    "the reduced-motion slowdown for the spinner: a floor under the person's own setting, not a speed",
  ],
]);

/** Comments blanked to the same number of newlines, so offsets still map to the real line. */
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ""));
const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;
const read = (path: string) => readFileSync(path, "utf8");

function timings() {
  const found: {
    where: string;
    key: string;
    prop: string;
    value: string;
  }[] = [];
  for (const file of readdirSync(THEME).filter((f) => f.endsWith(".css"))) {
    const css = withoutComments(read(join(THEME, file)));
    for (const m of css.matchAll(TIMING_PROPS)) {
      const [, prop, value] = m;
      if (!TIME.test(value)) continue;
      found.push({
        where: `${file}:${lineOf(css, m.index)} ${prop}: ${value.trim()}`,
        key: `${file}: ${prop}: ${value.trim()}`,
        prop,
        value,
      });
    }
  }
  return found;
}

/** The `@theme inline` block of tokens.css, as token → { value, where }. */
function themeTokens() {
  const css = withoutComments(read(join(THEME, "tokens.css")));
  const start = css.indexOf("@theme inline {");
  const end = css.indexOf("\n}", start);
  const tokens = new Map<
    string,
    {
      value: string;
      where: string;
    }
  >();
  for (const m of css.slice(start, end).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const value = m[2].replace(/\s+/g, " ").trim();
    tokens.set(m[1], {
      value,
      where: `tokens.css:${lineOf(css, start + m.index)} ${m[1]}: ${value}`,
    });
  }
  return tokens;
}

/** A token's value in an upstream stylesheet. */
function definedIn(path: string, token: string) {
  const m = read(path).match(new RegExp(`${token}\\s*:\\s*([^;]+);`));
  if (!m) throw new Error(`${path} no longer defines ${token}`);
  return m[1].trim();
}

/** Undo the contract: every motion var() back to its fallback, every scaled calc back to its time. */
const unscaled = (value: string) =>
  value
    .replace(/var\(--motion-ease-[\w-]+, ((?:[^()]|\([^()]*\))+)\)/g, "$1")
    .replace(/calc\(([\d.]+m?s) \* var\(--motion-(?:loop-)?scale, 1\)\)/g, "$1");
/** Whitespace and leading zeros out, so a minified upstream value compares equal. */
const canon = (value: string) => value.replace(/\s+/g, "").replace(/(?<![\d.])0\.(\d)/g, ".$1");

const TAILWIND_THEME = "node_modules/tailwindcss/theme.css";
const TW_ANIMATE = "node_modules/tw-animate-css/dist/tw-animate.css";

describe("hand-written timings", () => {
  it("each runs on a motion scale", () => {
    const off = timings()
      .filter(({ value }) => !SCALE.test(value))
      .filter(({ key }) => !EXEMPT.has(key))
      .map(({ where }) => where);
    expect(off).toEqual([]);
  });

  it("each shorthand takes its curve from an easing role (a loop may be linear or steps)", () => {
    const off = timings()
      .filter(({ prop }) => prop === "transition" || prop === "animation")
      .filter(({ value }) => !EASING.test(value))
      .map(({ where }) => where);
    expect(off).toEqual([]);
  });

  it("a loop runs on the loop scale, a transition on the motion scale", () => {
    const off = timings()
      .filter(({ value }) => SCALE.test(value))
      .filter(({ prop, value }) => prop.startsWith("transition") === value.includes("--motion-loop-scale"))
      .map(({ where }) => where);
    expect(off).toEqual([]);
  });

  it("finds the timings it pins, so the scan cannot pass empty", () => {
    expect(timings().filter(({ value }) => SCALE.test(value)).length).toBeGreaterThanOrEqual(6);
  });

  it("keeps each exemption real", () => {
    const keys = new Set(timings().map((t) => t.key));
    for (const key of EXEMPT.keys()) expect(keys.has(key), key).toBe(true);
  });

  it("restates the shimmer's duration on the loop scale, ahead of the reduced-motion stop", () => {
    const css = withoutComments(read(join(THEME, "utilities.css")));
    const scaled = css.indexOf("animation-duration: calc(2s * var(--motion-loop-scale, 1))");
    const stop = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(scaled).toBeGreaterThan(-1);
    expect(stop).toBeGreaterThan(scaled);
  });
});

describe("Tailwind theme tokens", () => {
  const tokens = themeTokens();
  const at = (token: string) => tokens.get(token)?.where ?? `${token} missing from tokens.css @theme inline`;

  it("every duration step and the default sit on the motion scale", () => {
    const expected: [
      string,
      string,
    ][] = [
      [
        "--default-transition-duration",
        "calc(150ms * var(--motion-scale, 1))",
      ],
      ...[
        0,
        75,
        100,
        150,
        200,
        300,
        500,
        700,
        1000,
      ].map(
        (n) =>
          [
            `--transition-duration-${n}`,
            `calc(${n}ms * var(--motion-scale, 1))`,
          ] as [
            string,
            string,
          ],
      ),
    ];
    const off = expected.filter(([token, value]) => tokens.get(token)?.value !== value).map(([token]) => at(token));
    expect(off).toEqual([]);
  });

  it("the default duration falls back to Tailwind's own", () => {
    expect(unscaled(tokens.get("--default-transition-duration")?.value ?? "")).toBe(definedIn(TAILWIND_THEME, "--default-transition-duration"));
  });

  /* token → [role, the literal it had before]. Sistine's own curves are pinned here; ease-in is Tailwind's. */
  const EASES: [
    string,
    string,
    string,
  ][] = [
    [
      "--ease-out",
      "enter",
      "cubic-bezier(0.23, 1, 0.32, 1)",
    ],
    [
      "--ease-in-out",
      "in-out",
      "cubic-bezier(0.77, 0, 0.175, 1)",
    ],
    [
      "--ease-drawer",
      "emphasized",
      "cubic-bezier(0.32, 0.72, 0, 1)",
    ],
    [
      "--default-transition-timing-function",
      "enter",
      "cubic-bezier(0.23, 1, 0.32, 1)",
    ],
    [
      "--ease-in",
      "exit",
      definedIn(TAILWIND_THEME, "--ease-in"),
    ],
  ];

  it("every easing token reads its role, falling back to the literal it had", () => {
    const off = EASES.filter(([token, role, literal]) => tokens.get(token)?.value !== `var(--motion-ease-${role}, ${literal})`).map(([token]) =>
      at(token),
    );
    expect(off).toEqual([]);
  });

  it("no easing token is left off the roles", () => {
    const off = [
      ...tokens,
    ]
      .filter(([token]) => token.startsWith("--ease-") || token === "--default-transition-timing-function")
      .filter(([, { value }]) => !value.startsWith("var(--motion-ease-"))
      .map(([, { where }]) => where);
    expect(off).toEqual([]);
  });

  it("the loops run on the loop scale and otherwise equal Tailwind's", () => {
    const off = [
      "spin",
      "ping",
      "pulse",
      "bounce",
    ]
      .map((name) => `--animate-${name}`)
      .filter((token) => {
        const value = tokens.get(token)?.value ?? "";
        return !value.includes("var(--motion-loop-scale, 1)") || unscaled(value) !== definedIn(TAILWIND_THEME, token);
      })
      .map(at);
    expect(off).toEqual([]);
  });

  it("tw-animate's enter/exit and accordion/collapsible default onto the tokens and otherwise equal tw-animate's", () => {
    const off = [
      "in",
      "out",
      "accordion-down",
      "accordion-up",
      "collapsible-down",
      "collapsible-up",
    ]
      .map((name) => `--animate-${name}`)
      .filter((token) => {
        const value = tokens.get(token)?.value ?? "";
        // Only the DEFAULT is scaled: --tw-duration (a duration-N class, already scaled) comes first, so nothing scales twice.
        const defaultScaled = /var\(--tw-duration, calc\([\d.]+s \* var\(--motion-scale, 1\)\)\)/.test(value);
        const defaultEased = /var\(--tw-ease, var\(--motion-ease-(standard|enter), /.test(value);
        return !defaultScaled || !defaultEased || canon(unscaled(value)) !== canon(definedIn(TW_ANIMATE, token));
      })
      .map(at);
    expect(off).toEqual([]);
  });
});

describe("reduced motion gives way to a consumer's motion dial", () => {
  const OS = "@media (prefers-reduced-motion: reduce)";
  const squash = (s: string) => s.replace(/\s+/g, " ").trim();

  /** Each rule inside the theme's reduced-motion media block, and the text after the block. */
  function osBlock() {
    const css = withoutComments(read(join(THEME, "utilities.css")));
    const open = css.indexOf("{", css.indexOf(OS));
    let depth = 0;
    let close = open;
    for (let i = open; i < css.length; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}" && --depth === 0) {
        close = i;
        break;
      }
    }
    const rules = [
      ...css.slice(open + 1, close).matchAll(/([^{}]+)\{([^{}]*)\}/g),
    ].map((m) => ({
      selectors: m[1].split(",").map((s) => s.trim()),
      decls: squash(m[2]),
      where: `utilities.css:${lineOf(css, open + 1 + m.index + m[0].length - m[0].trimStart().length)}`,
    }));
    return {
      rules,
      after: squash(css.slice(close + 1)),
    };
  }

  it("the OS query applies only when data-motion is absent", () => {
    const { rules } = osBlock();
    expect(rules.length).toBeGreaterThanOrEqual(2);
    const bare = rules.flatMap(({ selectors, where }) =>
      selectors.filter((s) => !s.startsWith(":root:not([data-motion]) ")).map((s) => `${where} ${s}`),
    );
    expect(bare).toEqual([]);
  });

  it('data-motion="no" applies the same treatment, outside the query', () => {
    const { rules, after } = osBlock();
    const missing = rules
      .filter(({ selectors, decls }) => {
        const dial = selectors.map((s) => s.replace(":root:not([data-motion]) ", ':root[data-motion="no"] ')).join(", ");
        return !after.includes(`${dial} { ${decls} }`);
      })
      .map(({ where }) => where);
    expect(missing).toEqual([]);
  });

  it("every reduced-motion query in the theme and the components is gated on data-motion", () => {
    const sources = [
      ...readdirSync(THEME).map((f) => join(THEME, f)),
      ...readdirSync("components/ui").map((f) => join("components/ui", f)),
      "components/pattern-background.tsx",
    ];
    const ungated = sources.filter((f) => read(f).includes("prefers-reduced-motion") && !read(f).includes("data-motion"));
    expect(ungated).toEqual([]);
  });
});

/** Resolves the theme's imports the way a bundler would: packages by their `style` entry, the rest relative. */
async function loadStylesheet(id: string, base: string) {
  const packages: Record<string, string> = {
    tailwindcss: "node_modules/tailwindcss/index.css",
    "tw-animate-css": TW_ANIMATE,
  };
  const path = packages[id] ? resolve(packages[id]) : resolve(base, id);
  return {
    path,
    base: dirname(path),
    content: read(path),
  };
}

describe("compiled classes (Tailwind's own compiler over the real theme)", () => {
  it("duration, ease, loop and enter/exit classes read the tokens", async () => {
    const compiler = await compile(read("app/globals.css"), {
      base: resolve("app"),
      loadStylesheet,
    });
    const out = compiler.build([
      "duration-200",
      "ease-out",
      "ease-in",
      "animate-spin",
      "animate-pulse",
      "animate-in",
      "transition",
    ]);
    const rule = (cls: string) => out.match(new RegExp(`\\n {2}\\.${cls} \\{([^}]*)\\}`))?.[1] ?? `.${cls} not emitted`;
    expect(rule("duration-200")).toContain("transition-duration: calc(200ms * var(--motion-scale, 1))");
    expect(rule("ease-out")).toContain("transition-timing-function: var(--motion-ease-enter, cubic-bezier(0.23, 1, 0.32, 1))");
    expect(rule("ease-in")).toContain("transition-timing-function: var(--motion-ease-exit, ");
    expect(rule("animate-spin")).toContain("animation: spin calc(1s * var(--motion-loop-scale, 1)) linear infinite");
    expect(rule("animate-pulse")).toContain("calc(2s * var(--motion-loop-scale, 1))");
    expect(rule("animate-in")).toContain("var(--tw-duration, calc(0.15s * var(--motion-scale, 1)))");
    expect(rule("transition")).toContain("transition-duration: var(--tw-duration, calc(150ms * var(--motion-scale, 1)))");
    expect(rule("transition")).toContain("transition-timing-function: var(--tw-ease, var(--motion-ease-enter, cubic-bezier(0.23, 1, 0.32, 1)))");
  }, 30_000);
});
