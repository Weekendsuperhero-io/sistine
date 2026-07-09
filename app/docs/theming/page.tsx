import type { ReactNode } from "react";
import { ForegroundTester } from "@/components/foreground-tester";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Block code sample. */
function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="glass-bg overflow-x-auto rounded-lg p-4 font-mono text-sm">
      <code className="text-foreground">{children}</code>
    </pre>
  );
}

/** Inline code token. */
function IC({ children }: { children: ReactNode }) {
  return <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

export default function ThemingPage() {
  return (
    <div className="text-foreground">
      <div className="mb-6 md:mb-8">
        <h1 className="mb-4 font-bold text-2xl text-foreground-soft sm:text-3xl md:text-4xl">Theming</h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Recolor and restyle the glass with a few CSS hooks. They ship in <IC>@sistine/theme</IC> (and are embedded in every component), so they work
          the moment you install anything — these are the same knobs the demo&apos;s header switchers drive.
        </p>
      </div>

      <div className="space-y-8">
        <Card variant="glass" id="model" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Mental model</CardTitle>
            <CardDescription className="text-muted-foreground">
              Every glass surface is two axes you compose — <strong>material</strong> × <strong>tier</strong> — with color on top.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <strong>Tier</strong> (how see-through): <IC>bg</IC> → <IC>surface</IC> → <IC>solid</IC> → <IC>opaque</IC>. Set with <IC>variant</IC>{" "}
                or the <IC>glass-*</IC> class.
              </li>
              <li>
                <strong>Material</strong> (the look): <IC>glass</IC> · <IC>frosted</IC> · <IC>crystal</IC> · <IC>gradient</IC>. Set with{" "}
                <IC>data-glass</IC> on an ancestor (or the <IC>variant</IC> shortcut). Crystal has three <strong>flavors</strong> —{" "}
                <IC>data-crystal</IC> white / tonal / hue (see below).
              </li>
            </ul>
            <p className="text-muted-foreground">
              Pick a cell — row = material (<IC>data-glass</IC>), column = tier (<IC>variant</IC>):
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-foreground">
                    {[
                      "",
                      "bg",
                      "surface",
                      "solid",
                      "opaque",
                    ].map((h) => (
                      <th key={h || "_"} className="border border-foreground/15 px-3 py-2 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border border-foreground/15 px-3 py-2 font-semibold text-foreground">glass</td>
                    {[
                      "glass",
                      "surface",
                      "solid",
                      "opaque",
                    ].map((t) => (
                      <td key={t} className="border border-foreground/15 px-3 py-2">
                        <IC>variant=&quot;{t}&quot;</IC>
                      </td>
                    ))}
                  </tr>
                  {[
                    "frosted",
                    "crystal",
                  ].map((m) => (
                    <tr key={m}>
                      <td className="border border-foreground/15 px-3 py-2 font-semibold text-foreground">{m}</td>
                      <td className="border border-foreground/15 px-3 py-2" colSpan={4}>
                        <IC>data-glass=&quot;{m}&quot;</IC> on an ancestor + any tier <IC>variant</IC> above
                        {m === "crystal" ? " (e.g. the solid tier here = a solid crystal)" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">
              <strong>Shortcut:</strong> <IC>variant=&quot;frosted&quot;</IC> / <IC>&quot;crystal&quot;</IC> jumps to that material at its own (sheer)
              default tier — use the full <IC>data-glass</IC> × <IC>variant</IC> form only to put a material at a different tier. <IC>opaque</IC> is
              the solid endpoint: a surface is solid regardless of material.
            </p>
            <p className="text-muted-foreground">To build any surface, answer three questions:</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                <strong>Texture?</strong> → <IC>data-glass</IC> (or skip for plain glass)
              </li>
              <li>
                <strong>How solid?</strong> → <IC>variant</IC> / <IC>glass-*</IC> class
              </li>
              <li>
                <strong>What color?</strong> → <IC>data-glass-tint</IC> (+ <IC>--glass-solid-a</IC> to dial the solid tier)
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card variant="glass" id="tint" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">
              Glass tint — <IC>data-glass-tint</IC>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Recolor all glass in a subtree. Works on any element, not just <IC>&lt;html&gt;</IC>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Set <IC>data-glass-tint</IC> to a preset — on <IC>&lt;html&gt;</IC> for the whole app, or on any wrapper to tint just that section (it
              re-resolves per scope):
            </p>
            <Code>{`<html data-glass-tint="sapphire">        <!-- whole app -->

<section data-glass-tint="sistine">      <!-- just this panel -->
  <Card variant="crystal">…</Card>
</section>`}</Code>
            <div>
              <h3 className="mb-2 font-semibold">Presets</h3>
              <p className="mb-2 text-muted-foreground">
                <strong>Jewels</strong> (single hue): neutral, rose, carnelian, amber, bone, peridot, emerald, turquoise, aquamarine, sapphire,
                amethyst, tourmaline.
              </p>
              <p className="mb-2 text-muted-foreground">
                <strong>Frescoes</strong> (multi-hue gradients): sistine, muse, aurora, gloaming.
              </p>
              <p className="text-muted-foreground">
                <strong>Status</strong>: info, success, warning, destructive — used by Alert/Button, but settable on any element to tint it that
                status (e.g. <IC>data-glass-tint="info"</IC>).
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Custom color — OKLCH H · C · L</h3>
              <p className="mb-2 text-muted-foreground">
                For an arbitrary color, set the tint vars directly instead of a preset. The model is straight OKLCH: <strong>hue</strong> +{" "}
                <strong>chroma</strong> (the single &ldquo;how colorful&rdquo; dial — chroma <IC>0</IC> = neutral) + <strong>lightness</strong> (lower
                = deeper). There is no separate &ldquo;wash&rdquo; knob — the tint alpha is a fixed film per preset.
              </p>
              <Code>{`<div
  style={{
    "--glass-tint-h": 280,     /* hue 0–360 */
    "--glass-tint-c": 0.07,    /* chroma 0–~0.2 — the colorfulness master */
    "--glass-opaque-l": 40,    /* tint body lightness — lower = deep (e.g. deep purple) */
  }}
>`}</Code>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" id="style" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">
              Glass style — <IC>data-glass</IC> &amp; the <IC>variant</IC> prop
            </CardTitle>
            <CardDescription className="text-muted-foreground">Switch the glass material: glass, frosted, crystal, opaque.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Per component, use the {""}
              <IC>variant</IC> prop:
            </p>
            <Code>{`<Card variant="frosted">…</Card>
<Button variant="crystal">…</Button>`}</Code>
            <p className="text-muted-foreground">
              Globally (or per subtree), set <IC>data-glass</IC> to re-skin every glass surface inside:
            </p>
            <Code>{`<html data-glass="frosted">              <!-- all glass = frosted -->
<section data-glass="crystal">…</section>  <!-- scoped -->`}</Code>
          </CardContent>
        </Card>

        <Card variant="glass" id="crystal" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">
              Crystal flavors — <IC>data-crystal</IC>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Swap the crystal gloss: a white specular, a theme tint, or an iridescent hue sweep.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Crystal&apos;s shine has three flavors, set with <IC>data-crystal</IC> on any ancestor (default / unset = <IC>tonal</IC>). It composes
              with the crystal variant and <IC>data-glass=&quot;crystal&quot;</IC>:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-foreground">
                    {[
                      "data-crystal",
                      "gloss",
                    ].map((h) => (
                      <th key={h} className="border border-foreground/15 px-3 py-2 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    [
                      "white",
                      "flat white specular — the classic glass shine",
                    ],
                    [
                      "tonal",
                      "a tonally-close tint of the theme (pearlescent) — the default",
                    ],
                    [
                      "hue",
                      "iridescent — the highlight sweeps hues shifted ± around the tint",
                    ],
                  ].map(([k, d]) => (
                    <tr key={k}>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>{k}</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Code>{`<html data-crystal="hue">                    <!-- iridescent crystal everywhere -->
<section data-crystal="white">…</section>   <!-- classic specular, scoped -->`}</Code>
            <p className="text-muted-foreground">Tune the gloss with these tokens — all have safe defaults, so override only what you want:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-foreground">
                    {[
                      "token",
                      "default",
                      "what",
                    ].map((h) => (
                      <th key={h} className="border border-foreground/15 px-3 py-2 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    [
                      "--glass-gloss-l",
                      "94",
                      "highlight lightness (→ %); lower = bolder",
                    ],
                    [
                      "--glass-gloss-tint",
                      "2",
                      "tonal: × the theme chroma (0 = white)",
                    ],
                    [
                      "--glass-gloss-hue-span",
                      "40",
                      "hue: ° the sweep shifts ± around the tint",
                    ],
                    [
                      "--glass-gloss-c",
                      "0.16",
                      "hue: chroma of the swept stops",
                    ],
                    [
                      "--glass-gloss-hue-dir",
                      "1",
                      "direction (±1) — tonal streak / hue order",
                    ],
                  ].map(([t, d, w]) => (
                    <tr key={t}>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>{t}</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">{d}</td>
                      <td className="border border-foreground/15 px-3 py-2">{w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">
              Play with every flavor and knob live on the{" "}
              <a className="underline underline-offset-2" href="/colors">
                Colors
              </a>{" "}
              page.
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" id="surfaces" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Surface tiers — sheer → solid</CardTitle>
            <CardDescription className="text-muted-foreground">How see-through a surface is, independent of its material.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <IC>glass-bg</IC> — sheerest, borderless (the <IC>glass</IC> variant).
              </li>
              <li>
                <IC>glass-surface</IC> — same, plus a hairline border (also <IC>-sm</IC> / <IC>-lg</IC> sizes).
              </li>
              <li>
                <IC>glass-solid</IC> — a mostly-opaque, legible floor for menus / tooltips.
              </li>
              <li>
                <IC>glass-opaque</IC> — fully solid, no see-through (the <IC>opaque</IC> variant).
              </li>
            </ul>
            <p className="text-muted-foreground">
              All four tiers are component <IC>variant</IC>s — <IC>glass</IC> / <IC>surface</IC> / <IC>solid</IC> / <IC>opaque</IC> — or apply the raw{" "}
              <IC>glass-*</IC> class on a bare element:
            </p>
            <Code>{`<div className="glass-solid rounded-xl p-4">Legible overlay</div>`}</Code>
          </CardContent>
        </Card>

        <Card variant="glass" id="text" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Readable text &amp; contrast</CardTitle>
            <CardDescription className="text-muted-foreground">
              Legible foreground without the harsh pure-black / pure-white spike — APCA contrast, banded to the ARC &ldquo;Bronze Simple Mode&rdquo;
              criterion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Contrast is a <strong>band</strong>, not a maximum: enough to read (floor), capped so it doesn&apos;t glare (ceiling). Each role maps to
              an APCA <IC>Lc</IC> band, and it all routes through <IC>readableForeground()</IC> — which aims for the band&apos;s target instead of
              maxing out.
            </p>

            <div>
              <h3 className="mb-2 font-semibold">Size tiers — the easy path</h3>
              <p className="mb-3 text-muted-foreground">
                Three foreground utilities, computed once by <IC>AutoForeground</IC> and tinted with the theme. Swap the class by text size — no JS
                per element:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-foreground">
                      {[
                        "utility",
                        "band",
                        "for",
                      ].map((htxt) => (
                        <th key={htxt} className="border border-foreground/15 px-3 py-2 text-left font-semibold">
                          {htxt}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      [
                        "text-foreground",
                        "~body",
                        "body text (default)",
                      ],
                      [
                        "text-foreground-soft",
                        "Lc ~58",
                        "headings / large — eased off the spike",
                      ],
                      [
                        "text-foreground-strong",
                        "Lc ~90",
                        "fine / small print",
                      ],
                    ].map(([util, band, forr]) => (
                      <tr key={util}>
                        <td className="border border-foreground/15 px-3 py-2">
                          <IC>{util}</IC>
                        </td>
                        <td className="border border-foreground/15 px-3 py-2">{band}</td>
                        <td className="border border-foreground/15 px-3 py-2">{forr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <Code>{`<h1 className="text-foreground-soft">Heading</h1>
<p className="text-foreground">Body copy…</p>
<small className="text-foreground-strong">Fine print</small>
<GearIcon className="text-foreground-ui" />   {/* standalone icon */}`}</Code>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Icons</h3>
              <p className="text-muted-foreground">
                Icons are <strong>non-text</strong>, so the rule is <IC>Lc ≥ 45</IC> (the <IC>ui</IC> band — the APCA analog of WCAG&apos;s 3:1). A
                labeled icon just inherits <IC>currentColor</IC>; a <strong>standalone</strong> icon gets <IC>text-foreground-ui</IC> — the shipped
                icon foreground (ui band, target Lc 60) with an optional hue you can cycle from the{" "}
                <a className="underline underline-offset-2" href="/colors">
                  Colors
                </a>{" "}
                tester. Stroke weight is the dial — thin outlines need more contrast, bold / filled glyphs can go softer (Phosphor&apos;s{" "}
                <IC>weight</IC> prop).
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Off-theme surfaces</h3>
              <p className="mb-3 text-muted-foreground">
                For a surface that isn&apos;t the theme — a colored tool-call bubble, a status pill — band against <em>its</em> color. The hook is
                pure (no DOM read, memoized), so it scales to hundreds of them:
              </p>
              <Code>{`const bubble = { l: 70, c: 0.18, h: 50 };          // your orange (oklch)
const text = useReadableForeground(bubble, "body");
const icon = useReadableForeground(bubble, "ui");  // Lc ≥ 45`}</Code>
              <p className="mt-3 mb-2 text-muted-foreground">Or, for the accent-guard on a custom surface:</p>
              <Code>{`<ReadableText accent="--primary" on="oklch(70% 0.18 50)" usage="body">
  Brand color when legible, soft fallback when not
</ReadableText>`}</Code>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Usage bands</h3>
              <p className="mb-3 text-muted-foreground">
                The <IC>usage</IC> preset picks the band. Floors are spec-fed (ARC Bronze / WCAG); targets &amp; ceilings are tuned margins. Aim
                small, go softer as text gets larger:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-foreground">
                      {[
                        "usage",
                        "floor",
                        "for",
                      ].map((htxt) => (
                        <th key={htxt} className="border border-foreground/15 px-3 py-2 text-left font-semibold">
                          {htxt}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      [
                        "small",
                        "90",
                        "fine / thin text",
                      ],
                      [
                        "body",
                        "75",
                        "body (default)",
                      ],
                      [
                        "large",
                        "45",
                        "large text / headings",
                      ],
                      [
                        "ui",
                        "45",
                        "icons, controls, focus rings",
                      ],
                      [
                        "non-text",
                        "30",
                        "borders, dividers",
                      ],
                      [
                        "disabled",
                        "30",
                        "placeholder / disabled",
                      ],
                    ].map(([u, f, forr]) => (
                      <tr key={u}>
                        <td className="border border-foreground/15 px-3 py-2">
                          <IC>{u}</IC>
                        </td>
                        <td className="border border-foreground/15 px-3 py-2">{f}</td>
                        <td className="border border-foreground/15 px-3 py-2">{forr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Complementary accents</h3>
              <p className="mb-3 text-muted-foreground">
                <IC>complement()</IC> / <IC>harmony()</IC> derive accent hues off the theme color (oklch hue rotation — a balanced opposite, not the
                skewed HSL one); pair with the hook for readable text on them:
              </p>
              <Code>{`const accent   = complement({ l: 60, c: 0.15, h: themeHue });  // opposite hue
const onAccent = useReadableForeground(accent, "large");
// harmony(base, [120, 240]) → triadic · [-30, 30] → analogous`}</Code>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Which to reach for</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-foreground">
                      {[
                        "text on…",
                        "use",
                        "cost",
                      ].map((htxt) => (
                        <th key={htxt} className="border border-foreground/15 px-3 py-2 text-left font-semibold">
                          {htxt}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr>
                      <td className="border border-foreground/15 px-3 py-2">the theme surface, in bulk</td>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>text-foreground</IC> / <IC>-soft</IC> / <IC>-strong</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">zero JS / element</td>
                    </tr>
                    <tr>
                      <td className="border border-foreground/15 px-3 py-2">an accent that must stay legible</td>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>ReadableText</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">1 effect + observer / instance</td>
                    </tr>
                    <tr>
                      <td className="border border-foreground/15 px-3 py-2">an off-theme surface (many)</td>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>useReadableForeground</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">pure memo, no DOM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" id="harmonics" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Harmonic color tokens</CardTitle>
            <CardDescription className="text-muted-foreground">
              Color-wheel relationships derived from the theme hue — pure CSS, no JS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Every relationship off the harmony anchor (<IC>--harmony-h</IC> — the content hue, or <IC>0</IC> for the hue-less neutral / bone themes)
              ships as a token, so they rotate with the tint automatically. The hue tokens are angles — use anywhere as{" "}
              <IC>oklch(L C var(--hue-*))</IC>:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-foreground">
                    {[
                      "family",
                      "what",
                    ].map((h) => (
                      <th key={h} className="border border-foreground/15 px-3 py-2 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    [
                      "--hue-*",
                      "angle tokens: base, complement, analogous-1/2, split-1/2, triad-1/2, tetrad-1/2/3, square-1/2/3",
                    ],
                    [
                      "--color-*",
                      "ready vivid oklch colors at the accent envelope (complement, triad-1/2, split-1/2, analogous-1/2)",
                    ],
                    [
                      "--mono-1..3",
                      "a monochromatic ramp in the theme hue",
                    ],
                  ].map(([t, w]) => (
                    <tr key={t}>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>{t}</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">{w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Code>{`<div style={{ background: "oklch(0.6 0.16 var(--hue-triad-1))" }} />
<div style={{ background: "var(--color-complement)" }} />`}</Code>
            <p className="text-muted-foreground">
              Standalone icons (<IC>text-foreground-ui</IC>) can pin to any of these relationships — contrast-solved — from the{" "}
              <a className="underline underline-offset-2" href="/colors">
                Colors
              </a>{" "}
              tester.
            </p>
          </CardContent>
        </Card>

        {/* Live preview sits on the page background (one glass-solid card on the canvas) — not nested in a
            glass card — so its modeled Lc matches what ships. */}
        <section className="space-y-2 text-foreground">
          <h3 className="font-semibold">Foreground tier preview</h3>
          <ForegroundTester />
        </section>

        <Card variant="glass" id="tuning" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Tuning — CSS variables</CardTitle>
            <CardDescription className="text-muted-foreground">
              Fine dials, settable on <IC>&lt;html&gt;</IC> (global) or any element (scoped).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <IC>--glass-tint-h</IC> — tint <strong>hue</strong> (OKLCH H, 0–360).
              </li>
              <li>
                <IC>--glass-tint-c</IC> — tint <strong>chroma</strong>: the single &ldquo;how colorful&rdquo; master — it drives surfaces, text, and
                the harmonic accents together. <IC>0</IC> = neutral.
              </li>
              <li>
                <IC>--glass-opaque-l</IC> — tint <strong>body lightness</strong> (OKLCH L); lower = a deeper tint. Mode-aware default (90 light / 32
                dark), and the floor AutoForeground bands opaque-card text against.
              </li>
              <li>
                <IC>--glass-opacity</IC> — <strong>solidity floor</strong> for any glass element: <IC>0</IC> = the variant&apos;s natural sheer glass,{" "}
                <IC>1</IC> = reads as its opaque variant. Set inline or via the <IC>glass</IC> prop.
              </li>
              <li>
                <IC>--glass-solid-a</IC> — how solid the <IC>glass-solid</IC> floor is (≈0.25–0.75; default 0.65).
              </li>
              <li>
                <IC>--glass-opaque-outline</IC> — optional <strong>accent outline</strong> for opaque surfaces. Unset → the plain glass border; set it
                (e.g. <IC>var(--glass-accent)</IC>) on any ancestor to give every opaque component a colored edge.
              </li>
              <li>
                <IC>--glass-tint-a</IC> — the tint <strong>film</strong> alpha (per preset). The former &ldquo;Wash&rdquo; slider is retired — chroma
                is the colorfulness dial now.
              </li>
            </ul>
            <p className="text-muted-foreground">
              These re-resolve per scope, so a scoped <IC>data-glass-tint</IC> or an inline var affects just that subtree:
            </p>
            <Code>{`<aside style={{ "--glass-solid-a": 0.8 }}>
  <div className="glass-solid …">extra-solid here only</div>
</aside>`}</Code>
          </CardContent>
        </Card>

        <Card variant="glass" id="backgrounds" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Backgrounds</CardTitle>
            <CardDescription className="text-muted-foreground">Theme- and tint-aware wallpapers — installable, and fresco-aware.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Two background styles ship in the registry and recolor with the live tint — a fresco preset lays its full multi-hue palette across them,
              not just one color:
            </p>
            <Code>{`npx shadcn@latest add @sistine/canvas-background    # animated canvas (gradient / lava / circle)
npx shadcn@latest add @sistine/gradient-background  # pure-CSS gradient wallpaper`}</Code>
            <p className="text-muted-foreground">
              Mount one at your app root as a <IC>fixed inset-0 -z-10</IC> element — and keep it out of any <IC>transform</IC> / <IC>filter</IC> /{" "}
              <IC>contain</IC> ancestor, or it gets clipped to that box instead of the viewport.
            </p>
            <p className="text-muted-foreground">
              <IC>&lt;GradientBackground&gt;</IC> paints as a <IC>linear</IC>, <IC>radial</IC>, or <IC>conic</IC> gradient via its <IC>shape</IC>{" "}
              prop, with <IC>angle</IC>, <IC>position</IC>, and (radial) <IC>radialShape</IC> / <IC>radialSize</IC> geometry — e.g.{" "}
              <IC>&lt;GradientBackground shape=&quot;conic&quot; position=&quot;30% 70%&quot; /&gt;</IC>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
