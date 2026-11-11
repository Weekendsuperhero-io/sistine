/**
 * Night STATE collisions: at night, hovering or pressing an element must not take the fill or the text a
 * state paints on it (a selected calendar day, an open trigger, an active tab, an on toggle).
 *
 * Why it needs its own test: Tailwind emits every `dark:` utility AFTER every built-in variant, so a
 * `dark:hover:text-*` (or the ghost Button's `dark:hover:bg-accent/50`) on an element that also carries
 * `data-[selected-single=true]:text-*` wins at night whenever that element is hovered, at equal
 * specificity, purely by source order. The calendar's selected day did exactly that (measured in Chromium):
 * hovered at night it lost its primary pill to the ghost Button's dark:hover:bg-accent/50 and its ink to
 * dark:hover:text-accent-foreground, so a selected day read as one merely hovered. No colour check sees
 * it, because each pairing is fine on its own; only the cascade puts them together.
 *
 * So the cascade is resolved for real: Tailwind compiles the site's stylesheet from the component sources
 * (as scripts/check-compat.ts does), the components render with their merged class lists, and for every
 * element and every state its own classes name (data-[…] / aria-[…]), the winning background-color and
 * color are taken from the compiled rules by specificity, then source order, at night, at rest, hovered
 * and pressed. Two things must hold for every state:
 *   - it is KEPT: where the state paints its own fill or text at rest, the hovered or pressed winner is
 *     either a rule that names the state too (data-[state=open]:hover:bg-accent is a deliberate hovered
 *     state) or the same value. A generic hover or press rule taking it over is the collision;
 *   - it still READS: the winning tokens, measured on every preset through tests/theme-cascade, read at
 *     least what the state reads at rest (to 1 Lc), or the body floor plus margin if that is lower.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import tailwind from "@tailwindcss/postcss";
import { cleanup, render } from "@testing-library/react";
import postcss, { type AtRule, type Rule } from "postcss";
import selectorParser from "postcss-selector-parser";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apcaContrast, compositeSurface, glassSolidSurface, type OklchColor, READABLE_USAGE } from "@/lib/oklch-utils";
import { colorOf, computedVars, html, numberOf, presetNames } from "./theme-cascade";

const ROOT = process.cwd();
const FLOOR = READABLE_USAGE.body.floor + 1.5;

/* ── The compiled stylesheet, as a list of single-class rules ───────────────────────────────────── */
interface CompiledRule {
  order: number;
  /** The rest of the compound after the utility's own class, as selector-parser nodes. */
  rest: selectorParser.Node[];
  spec: number;
  bg?: string;
  color?: string;
}
const byClass = new Map<string, CompiledRule[]>();

/** Specificity of the compound's tail, in (0,1,0) units; :where() adds nothing. */
const specOf = (nodes: selectorParser.Node[]): number =>
  nodes.reduce((n, node) => {
    if (node.type === "attribute" || node.type === "class") return n + 1;
    if (node.type === "pseudo") {
      if (node.value === ":where") return n;
      if (node.value === ":not" || node.value === ":is") return n + Math.max(0, ...node.nodes.map((s) => specOf(s.nodes)));
      return n + 1;
    }
    return n;
  }, 0);

beforeAll(async () => {
  const site = join(ROOT, "app/site.css");
  const out = await postcss([
    tailwind({
      base: ROOT,
      optimize: false,
    }),
  ]).process(readFileSync(site, "utf8"), {
    from: site,
  });
  let order = 0;
  out.root.walkRules((rule: Rule) => {
    order++;
    /* Only rules every night page applies: a hover media query holds (a pointer), @supports holds (every
       engine in the floor mixes colours); any other condition (a breakpoint, print, reduced motion) is out. */
    for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
      if (p.type === "atrule") {
        const a = p as AtRule;
        if (a.name === "media" && !/\(hover:\s*hover\)/.test(a.params)) return;
        if (a.name !== "media" && a.name !== "supports" && a.name !== "layer") return;
      }
    }
    let bg: string | undefined;
    let color: string | undefined;
    rule.walkDecls((d) => {
      if (d.prop === "background-color") bg = d.value;
      if (d.prop === "color") color = d.value;
    });
    if (bg === undefined && color === undefined) return;
    selectorParser((sels) => {
      sels.each((sel) => {
        const nodes = sel.nodes;
        const head = nodes[0];
        if (head?.type !== "class") return;
        const rest = nodes.slice(1);
        if (rest.some((n) => n.type === "combinator" || (n.type === "pseudo" && n.value.startsWith("::")))) return;
        const list = byClass.get(head.value) ?? [];
        list.push({
          order,
          rest,
          spec: 1 + specOf(rest),
          bg,
          color,
        });
        byClass.set(head.value, list);
      });
    }).processSync(rule.selector);
  });
}, 120_000);

afterEach(cleanup);

/* ── Matching a compiled rule's tail against an element in a scenario ─────────────────────────────── */
interface Scenario {
  hover: boolean;
  active: boolean;
  attrs: Map<string, string>;
  tag: string;
}
function holds(node: selectorParser.Node, s: Scenario): boolean {
  if (node.type === "attribute") {
    const v = s.attrs.get(node.attribute);
    if (v === undefined) return false;
    return node.value === undefined || node.value === v;
  }
  if (node.type === "tag") return node.value === s.tag;
  if (node.type === "pseudo") {
    switch (node.value) {
      case ":hover":
        return s.hover;
      case ":active":
        return s.active;
      case ":where":
        // `dark:` is :where(.dark, .dark *): night, which is all this test measures.
        return node.toString().includes(".dark");
      case ":not":
        return !node.nodes.some((sel) => sel.nodes.every((n) => holds(n, s)));
      case ":is":
        return node.nodes.some((sel) => sel.nodes.every((n) => holds(n, s)));
      default:
        return false; // focus, disabled, checked, placeholder…: not states this test drives
    }
  }
  return false;
}

/** The winning rule for a property on an element, given its classes, in a scenario. */
function winningRule(classes: string[], s: Scenario, prop: "bg" | "color"): CompiledRule | undefined {
  let best: CompiledRule | undefined;
  for (const c of classes) {
    for (const r of byClass.get(c) ?? []) {
      if (r[prop] === undefined || !r.rest.every((n) => holds(n, s))) continue;
      if (!best || r.spec > best.spec || (r.spec === best.spec && r.order > best.order)) best = r;
    }
  }
  return best;
}
const winner = (classes: string[], s: Scenario, prop: "bg" | "color") => winningRule(classes, s, prop)?.[prop];
/** Whether a rule is conditioned on the element's state attribute (it says data-[x=…] / aria-… itself). */
const namesState = (r: CompiledRule | undefined, attr: string) =>
  !!r?.rest.some((n) => (n.type === "attribute" && n.attribute === attr) || (n.type === "pseudo" && n.toString().includes(`[${attr}`)));

/* ── Night colours, from the shipped tokens ───────────────────────────────────────────────────────── */
/** A Tailwind colour value as a token and an alpha: var(--x) or color-mix(in oklab, var(--x) N%, transparent). */
function tokenOf(value: string | undefined):
  | {
      token: string;
      a: number;
    }
  | undefined {
  if (!value) return undefined;
  const mix = /color-mix\(in oklab, var\((--[a-z0-9-]+)\) ([\d.]+)%, transparent\)/.exec(value);
  if (mix)
    return {
      token: mix[1],
      a: Number(mix[2]) / 100,
    };
  const plain = /^var\((--[a-z0-9-]+)\)$/.exec(value.trim());
  return plain
    ? {
        token: plain[1],
        a: 1,
      }
    : undefined;
}

/* Resolving the cascade is the slow part; each preset's surface and token colours are resolved once. */
const surfaceCache = new Map<string, OklchColor>();
const colorCache = new Map<string, ReturnType<typeof colorOf> | null>();
/** A token's night colour on a preset; null for `transparent` (bg-background: the surface shows). */
const nightColor = (token: string, tint: string) => {
  const key = `${tint} ${token}`;
  if (!colorCache.has(key)) {
    const raw = computedVars(html(true, tint)).get(token);
    colorCache.set(key, raw?.trim() === "transparent" ? null : colorOf(token, html(true, tint)));
  }
  return colorCache.get(key) ?? null;
};
function nightSurface(tint: string): OklchColor {
  const cached = surfaceCache.get(tint);
  if (cached) return cached;
  const night = html(true, tint);
  const solidify = colorOf("--glass-solidify-bg", night);
  const wash = colorOf("--glass-tint-wash", night);
  const surface = glassSolidSurface(
    true,
    {
      h: wash.h,
      c: numberOf("--glass-tint-c", night),
      a: wash.a,
    },
    numberOf("--glass-solid-a", night),
    wash.l,
    numberOf("--glass-wash-c-mult", night),
    {
      l: solidify.l,
      c: solidify.c,
      a: 0.7,
    },
    numberOf("--glass-solid-l", night),
    numberOf("--glass-wash-c-max", night),
  );
  surfaceCache.set(tint, surface);
  return surface;
}

/** The Lc the text reads in a scenario, on a preset at night. Inherited text is the page's body ink. */
function lcIn(
  classes: string[],
  s: Scenario,
  tint: string,
): {
  lc: number;
  bg: string;
  color: string;
} {
  const surface = nightSurface(tint);
  const bgTok = tokenOf(winner(classes, s, "bg"));
  const colorTok = tokenOf(winner(classes, s, "color")) ?? {
    token: "--foreground",
    a: 1,
  };
  const fill = bgTok ? nightColor(bgTok.token, tint) : undefined;
  const ground = fill
    ? compositeSurface(surface, [
        {
          ...fill,
          a: fill.a * bgTok!.a,
        },
      ])
    : surface;
  const ink = nightColor(colorTok.token, tint) ?? nightColor("--foreground", tint)!;
  return {
    lc: Math.abs(apcaContrast(ink, ground)),
    bg: bgTok ? `${bgTok.token}${bgTok.a < 1 ? ` ${bgTok.a}` : ""}` : "(surface)",
    color: colorTok.token,
  };
}

/* ── The components, with their merged class lists ────────────────────────────────────────────────── */
const fixtures: Array<
  [
    string,
    () => React.ReactElement,
  ]
> = [
  [
    "Calendar (single)",
    () => <Calendar mode="single" selected={new Date(2026, 10, 11)} defaultMonth={new Date(2026, 10, 11)} />,
  ],
  [
    "Calendar (range)",
    () => (
      <Calendar
        mode="range"
        selected={{
          from: new Date(2026, 10, 9),
          to: new Date(2026, 10, 13),
        }}
        defaultMonth={new Date(2026, 10, 11)}
      />
    ),
  ],
  [
    "Accordion (default)",
    () => (
      <Accordion type="single" defaultValue="a" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger variant="default">Open</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  ],
  [
    "Item (link)",
    () => (
      <Item asChild>
        <a href="#x">
          <ItemContent>
            <ItemTitle>Release notes</ItemTitle>
          </ItemContent>
        </a>
      </Item>
    ),
  ],
  [
    "Menubar",
    () => (
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    ),
  ],
  [
    "NavigationMenu",
    () => (
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#x" active>
                Here
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    ),
  ],
  ...(
    [
      "default",
      "glass",
      "line",
    ] as const
  ).map(
    (
      variant,
    ): [
      string,
      () => React.ReactElement,
    ] => [
      `Tabs (${variant})`,
      () => (
        <Tabs defaultValue="a">
          <TabsList variant={variant}>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
        </Tabs>
      ),
    ],
  ),
  ...(
    [
      "default",
      "outline",
      "glass",
    ] as const
  ).map(
    (
      variant,
    ): [
      string,
      () => React.ReactElement,
    ] => [
      `Toggle (${variant})`,
      () => (
        <Toggle variant={variant} defaultPressed>
          B
        </Toggle>
      ),
    ],
  ),
  [
    "ToggleGroup",
    () => (
      <ToggleGroup type="single" defaultValue="a">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    ),
  ],
];

/** The states an element's own classes name: data-[x=y], data-[x], data-x, aria-[x=y], aria-x. */
function statesOf(classes: string[]): Array<
  [
    string,
    string,
  ]
> {
  const out = new Map<
    string,
    [
      string,
      string,
    ]
  >();
  for (const c of classes) {
    for (const m of c.matchAll(/(?:^|:)(?:not-)?(data|aria)-(?:\[([a-z-]+)(?:=([^\]]+))?\]|([a-z-]+))(?=:)/g)) {
      const name = `${m[1]}-${m[2] ?? m[4]}`;
      const value = m[3] ?? (m[1] === "aria" && m[4] ? "true" : "");
      out.set(`${name}=${value}`, [
        name,
        value,
      ]);
    }
  }
  return [
    ...out.values(),
  ];
}

describe("night state collisions (the cascade, from Tailwind's compiled stylesheet)", () => {
  it.each(
    fixtures.map(
      ([name, f]) =>
        [
          name,
          f,
        ] as const,
    ),
  )(
    "%s: hovering or pressing a state at night keeps what the state reads",
    (name, make) => {
      const { container } = render(make());
      const tints = [
        undefined,
        ...presetNames(),
      ].filter((t): t is string => t !== undefined);
      let checked = 0;
      const seen = new Set<string>();
      for (const el of container.querySelectorAll<HTMLElement>("[class]")) {
        const classes = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
        const tag = el.tagName.toLowerCase();
        const key = `${tag} ${classes.join(" ")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        /* No state at all, and each state the element's own classes name, one at a time. */
        for (const [attr, value] of [
          [
            "",
            "",
          ] as [
            string,
            string,
          ],
          ...statesOf(classes),
        ]) {
          const attrs = new Map(
            attr
              ? [
                  [
                    attr,
                    value,
                  ],
                ]
              : [],
          );
          if (!attr && !classes.some((c) => /(^|:)(hover|active):/.test(c))) continue;
          const rest = {
            hover: false,
            active: false,
            attrs,
            tag,
          };
          for (const [what, s] of [
            [
              "hovered",
              {
                ...rest,
                hover: true,
              },
            ],
            [
              "pressed",
              {
                ...rest,
                hover: true,
                active: true,
              },
            ],
          ] as const) {
            if (attr) {
              for (const prop of [
                "bg",
                "color",
              ] as const) {
                const atRule = winningRule(classes, rest, prop);
                if (!namesState(atRule, attr)) continue; // the state paints nothing of its own here
                const underRule = winningRule(classes, s, prop);
                expect(
                  namesState(underRule, attr) || underRule?.[prop] === atRule?.[prop],
                  `${name}: [${attr}${value ? `=${value}` : ""}] ${what} at night — its ${prop === "bg" ? "fill" : "text"} ${atRule?.[prop]} is taken by ${underRule?.[prop]}, a rule that does not name the state`,
                ).toBe(true);
              }
            }
            for (const tint of tints) {
              const at = lcIn(classes, rest, tint);
              const under = lcIn(classes, s, tint);
              expect(
                under.lc,
                `${name}: [${attr}${value ? `=${value}` : ""}] ${what} on ${tint} — ${under.color} on ${under.bg} reads ${under.lc.toFixed(1)} Lc, at rest ${at.color} on ${at.bg} read ${at.lc.toFixed(1)}`,
              ).toBeGreaterThanOrEqual(Math.min(at.lc, FLOOR) - 1);
              checked++;
            }
          }
        }
      }
      expect(checked, `${name}: no element carried a state or a hover class`).toBeGreaterThan(0);
    },
    60_000,
  );
});
