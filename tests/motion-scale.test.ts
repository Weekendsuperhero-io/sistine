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
import { transform } from "lightningcss";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { stopRules } from "../components/pattern-background";

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

  it("stops ping and bounce (they zoom and move) and leaves pulse (opacity only) alone, under both", () => {
    const { rules, after } = osBlock();
    const stopped = (cls: string) =>
      rules.some(({ selectors, decls }) => decls === "animation: none;" && selectors.includes(`:root:not([data-motion]) ${cls}`));
    expect(
      [
        ".animate-ping",
        ".animate-bounce",
      ].filter((cls) => !stopped(cls)),
    ).toEqual([]);
    const pulse = rules.filter(({ selectors }) => selectors.some((s) => s.includes(".animate-pulse"))).map(({ where }) => where);
    expect(pulse).toEqual([]);
    expect(after).not.toContain(".animate-pulse");
  });

  it("documents next to the loop tokens that the loop scale slows and never stops", () => {
    const tokens = read(join(THEME, "tokens.css"));
    expect(tokens).toMatch(/--motion-loop-scale[\s\S]{0,80}never stops/);
    expect(tokens).toMatch(/at 1 or more/);
  });
});

/** A selector list split at its top-level commas (not the ones inside `:where(…)`). */
function topLevelSplit(list: string) {
  const parts = [
    "",
  ];
  let depth = 0;
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) parts.push("");
    else parts[parts.length - 1] += ch;
  }
  return parts.map((s) => s.trim());
}

/** A rule is gated when it is scoped under a :root without data-motion: a descendant rule, or the
    ancestor `&` form a @custom-variant body writes (registrations.css). */
const GATED_SCOPE = ":root:not([data-motion]) ";
const GATED_NESTED = ":where(:root:not([data-motion])) &";
const isGated = (selector: string) => selector.startsWith(GATED_SCOPE) || selector === GATED_NESTED;

/** Every `@media (prefers-reduced-motion…)` block in `text`, with each rule inside it and its line. */
function reducedMotionQueries(text: string, file: string) {
  const css = withoutComments(text);
  const found: {
    where: string;
    rules: {
      selectors: string[];
      where: string;
    }[];
  }[] = [];
  for (const q of css.matchAll(/@media\s*\(prefers-reduced-motion[^{]*\{/g)) {
    const open = q.index + q[0].length - 1;
    let depth = 0;
    let close = open;
    for (let i = open; i < css.length; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}" && --depth === 0) {
        close = i;
        break;
      }
    }
    const body = css.slice(open + 1, close);
    found.push({
      where: `${file}:${lineOf(css, q.index)}`,
      rules: [
        ...body.matchAll(/([^{}]+)\{[^{}]*\}/g),
      ].map((m) => ({
        selectors: topLevelSplit(m[1]),
        where: `${file}:${lineOf(css, open + 1 + m.index + m[0].length - m[0].trimStart().length)}`,
      })),
    });
  }
  return found;
}

/** Every file under `dir` (recursively) with one of `exts`. */
function filesUnder(dir: string, exts: string[]): string[] {
  return readdirSync(dir, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path, exts);
    return exts.some((ext) => entry.name.endsWith(ext))
      ? [
          path,
        ]
      : [];
  });
}

describe("every reduced-motion query, one by one", () => {
  /* The theme, the site CSS, the shipped flat theme, and every component source. pattern-background's
     stopRules() builds its query from a template, so its source is checked through its OUTPUT instead. */
  const STOP_RULES = "components/pattern-background.tsx";
  const sources = () => [
    ...filesUnder("app", [
      ".css",
    ]),
    "registry/theme/globals.css",
    ...filesUnder("components", [
      ".ts",
      ".tsx",
    ]).filter((f) => f !== STOP_RULES),
  ];

  it("gates every rule inside it on :root:not([data-motion])", () => {
    const queries = [
      ...sources().flatMap((f) => reducedMotionQueries(read(f), f)),
      ...reducedMotionQueries(stopRules(".a", ".b"), "stopRules()"),
    ];
    const empty = queries.filter(({ rules }) => rules.length === 0).map(({ where }) => `${where} (no rules parsed)`);
    const ungated = queries.flatMap(({ rules }) =>
      rules.flatMap(({ selectors, where }) => selectors.filter((s) => !isGated(s)).map((s) => `${where} ${s}`)),
    );
    expect([
      ...empty,
      ...ungated,
    ]).toEqual([]);
    // the theme's own block, its flattened copy and stopRules(), so the scan cannot pass empty
    expect(queries.length).toBeGreaterThanOrEqual(3);
  });

  it("stopRules() is the only query pattern-background writes", () => {
    const src = read(STOP_RULES);
    expect(src.match(/@media\s*\(prefers-reduced-motion/g)?.length).toBe(1);
  });
});

/** Tailwind's duration steps (theme.css has no --transition-duration-*: these are the bare-value steps tokens.css scales). */
const DURATION_STEPS = new Set([
  0,
  75,
  100,
  150,
  200,
  300,
  500,
  700,
  1000,
]);

describe("no off-scale motion class in components/ or app/", () => {
  /* A class that writes its own time or curve bypasses the tokens: a bare duration-N off the steps (it
     stays literal), an arbitrary duration-[…] / delay-[…] / ease-[…] that reads no --motion-* token, and
     tw-animate's animation-duration-N. */
  const CLASS = /(?<![\w-])(duration-(\d+)\b|(?:duration|delay|ease)-\[[^\]\s]*\]|animation-duration-[\w.[\]()-]+)/g;
  const offScale = () =>
    [
      ...filesUnder("components", [
        ".ts",
        ".tsx",
      ]),
      ...filesUnder("app", [
        ".ts",
        ".tsx",
        ".mdx",
      ]),
    ].flatMap((f) => {
      const text = read(f);
      return [
        ...text.matchAll(CLASS),
      ]
        .filter(([cls, , step]) => (step === undefined ? !/var\(--motion-/.test(cls) : !DURATION_STEPS.has(Number(step))))
        .map((m) => `${f}:${lineOf(text, m.index)} ${m[1]}`);
    });

  it("finds none (the baseline is 0)", () => {
    expect(offScale()).toEqual([]);
  });

  /* `before:`/`after:` nest their rule inside the pseudo-element, where no ancestor condition can reach
     (Lightning CSS flattens `:where(…) &` there to `:is(.x::before)`, which matches nothing), so a motion
     variant must come first: `motion-reduce:before:…`. registrations.css says why. */
  it("puts a motion variant before before:, after:, selection: and marker:", () => {
    const wrong = [
      ...filesUnder("components", [
        ".ts",
        ".tsx",
      ]),
      ...filesUnder("app", [
        ".ts",
        ".tsx",
      ]),
    ].flatMap((f) => {
      const text = read(f);
      return [
        ...text.matchAll(/(?<![\w-])((?:before|after|selection|marker):(?:[^\s:"'`]+:)*motion-(?:safe|reduce):[^\s"'`]+)/g),
      ].map((m) => `${f}:${lineOf(text, m.index)} ${m[1]}`);
    });
    expect(wrong).toEqual([]);
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

  /* motion-safe: / motion-reduce: are redefined in registrations.css. Tailwind's own variant is a bare
     media query; with no data-motion, ours must be exactly that query over the same declarations, the
     selector only wrapped in :root:not([data-motion]) at zero specificity. */
  const NONE = ":where(:root:not([data-motion])) ";
  const VARIANTS: [
    string,
    string,
    string,
  ][] = [
    [
      "motion-reduce:transition-none",
      "reduce",
      ':where(:root[data-motion="no"]) ',
    ],
    [
      "motion-safe:animate-spin",
      "no-preference",
      ':where(:root[data-motion]:not([data-motion="no"])) ',
    ],
  ];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selectorOf = (cls: string) => `.${cls.replace(":", "\\:")}`;

  it("motion-reduce: and motion-safe: follow data-motion, and the OS only without it", async () => {
    const out = (
      await compile(read("app/globals.css"), {
        base: resolve("app"),
        loadStylesheet,
      })
    ).build(VARIANTS.map(([cls]) => cls));
    const missing = VARIANTS.flatMap(([cls, os, dial]) => {
      const sel = selectorOf(cls);
      const wants = [
        // the dial, whatever the OS says: outside any media query
        new RegExp(`\\n {2}${esc(dial + sel)} \\{`),
        // the OS, only when :root carries no data-motion
        new RegExp(`@media \\(prefers-reduced-motion: ${os}\\) \\{\\s*${esc(NONE + sel)} \\{`),
      ];
      return wants.filter((re) => !re.test(out)).map((re) => `${cls}: ${re.source}`);
    });
    expect(missing).toEqual([]);
    // no bare OS query left behind for either class
    const bare = VARIANTS.filter(([cls, os]) =>
      new RegExp(`@media \\(prefers-reduced-motion: ${os}\\) \\{\\s*${esc(selectorOf(cls))} \\{`).test(out),
    );
    expect(bare.map(([cls]) => cls)).toEqual([]);
  }, 30_000);

  it("without data-motion they emit what Tailwind's own variants do", async () => {
    const ours = (
      await compile(read("app/globals.css"), {
        base: resolve("app"),
        loadStylesheet,
      })
    ).build(VARIANTS.map(([cls]) => cls));
    const stock = (
      await compile('@import "tailwindcss";\n@import "tw-animate-css";\n@import "./theme/tokens.css";', {
        base: resolve("app"),
        loadStylesheet,
      })
    ).build(VARIANTS.map(([cls]) => cls));
    /* The OS-gated block of each: its media query and declarations. Ours carries the :where() ancestor. */
    const block = (css: string, cls: string, os: string, prefix: string) =>
      css.match(new RegExp(`@media \\(prefers-reduced-motion: ${os}\\) \\{\\s*${esc(prefix + selectorOf(cls))} \\{([^}]*)\\}`))?.[1].trim() ??
      `${cls} (${os}) not emitted`;
    /* The dial's rule, outside any media query, declares the same as the OS block. */
    const dialRule = (css: string, cls: string, dial: string) =>
      css.match(new RegExp(`\\n {2}${esc(dial + selectorOf(cls))} \\{([^}]*)\\}`))?.[1].trim() ?? `${cls} dial rule not emitted`;
    for (const [cls, os, dial] of VARIANTS) {
      expect(block(ours, cls, os, NONE), cls).toBe(block(stock, cls, os, ""));
      expect(dialRule(ours, cls, dial), `${cls} dial`).toBe(block(stock, cls, os, ""));
    }
  }, 30_000);

  it("stack after hover, dark and a pseudo-element, and flatten to selectors a browser parses", async () => {
    const classes = [
      "motion-safe:hover:opacity-50",
      "dark:motion-reduce:transition-none",
      "placeholder:motion-safe:transition-all",
      "motion-reduce:before:animate-none",
      "motion-safe:after:animate-spin",
      "motion-reduce:selection:transition-none",
    ];
    const built = (
      await compile(read("app/globals.css"), {
        base: resolve("app"),
        loadStylesheet,
      })
    ).build(classes);
    /* A production build flattens nesting (Lightning CSS, as Tailwind's own optimizer does). */
    const flat = transform({
      filename: "motion.css",
      code: Buffer.from(built),
      minify: false,
      targets: {
        safari: (16 << 16) | (4 << 8),
      },
    }).code.toString();
    const selectors = [
      ...flat.matchAll(/^\s*([^@{}\s][^{}]*?)\s*\{/gm),
    ].map((m) => m[1].trim());
    /* A pseudo-element ends its compound selector: :where() after ::placeholder or ::before is a rule no
       browser parses, so it is dropped whole (the `&:where(…)` form did that). And a pseudo-element inside
       :is(), or an empty :is(), matches nothing: what a nested variant flattens to when the motion
       condition comes second (`before:motion-reduce:`, the descendant half of `selection:motion-reduce:`). */
    expect(selectors.filter((sel) => /::?(placeholder|before|after|selection|marker)[^\s,]*:where\(/.test(sel))).toEqual([]);
    expect(selectors.filter((sel) => /:is\(\s*\)|:is\([^)]*::?(before|after|selection|marker|placeholder)/.test(sel))).toEqual([]);
    const want = [
      ':where(:root[data-motion="no"]) .motion-reduce\\:before\\:animate-none',
      ":where(:root:not([data-motion])) .motion-reduce\\:before\\:animate-none",
      ':where(:root[data-motion]:not([data-motion="no"])) .motion-safe\\:after\\:animate-spin',
      ':where(:root[data-motion]:not([data-motion="no"])) .placeholder\\:motion-safe\\:transition-all',
      ':where(:root[data-motion="no"]) .dark\\:motion-reduce\\:transition-none',
      ':where(:root[data-motion]:not([data-motion="no"])) .motion-safe\\:hover\\:opacity-50',
    ];
    const missing = want.filter((w) => !selectors.some((sel) => sel.startsWith(w)));
    expect(missing, flat).toEqual([]);
  }, 30_000);
});
