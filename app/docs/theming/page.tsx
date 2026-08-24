import type { ReactNode } from "react";
import { DiffuseComparisonDemo } from "@/components/diffuse-comparison-demo";
import { ForegroundTester } from "@/components/foreground-tester";
import { StainedComparisonDemo } from "@/components/stained-comparison-demo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VeilComparisonDemo } from "@/components/veil-comparison-demo";

/** Block code sample. */
function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="glass overflow-x-auto rounded-lg p-4 font-mono text-sm">
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
          the moment you install anything: these are the same knobs the demo&apos;s header switchers drive.
        </p>
      </div>

      <div className="space-y-8">
        <Card id="model" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Mental model</CardTitle>
            <CardDescription className="text-muted-foreground">
              Every glass surface is one <strong>material</strong> you pick, plus orthogonal <strong>axes</strong> you switch on.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <strong>Material</strong> (the substance): <IC>glass</IC> · <IC>frosted</IC> · <IC>crystal</IC> · <IC>chakra</IC> · <IC>opaque</IC>.
                Set it with the <IC>material</IC> prop, or leave it off for <strong>adaptive</strong> glass, the default, which follows the
                page&apos;s <IC>data-glass</IC> style. Crystal has three <strong>flavors</strong>: <IC>data-gloss</IC> white / tonal / hue (see
                below).
              </li>
              <li>
                <strong>Axes</strong> (orthogonal, so they compose freely on any material): <IC>border</IC>, <IC>veil</IC> (a legible floor for menus
                / overlays), <IC>diffuse</IC> (a readability blur floor), <IC>gradient</IC> (brand wash), <IC>glow</IC>, <IC>sheen</IC> (hover
                shimmer). Each is a prop on a component, or a <IC>glass-*</IC> class on a bare element.
              </li>
            </ul>
            <p className="text-muted-foreground">The five materials. Pin one with the prop, or on a raw element with the attribute:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-foreground">
                    {[
                      "material",
                      "prop",
                      "raw element",
                      "look",
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
                      "glass",
                      'material="glass" (or default)',
                      'data-material="glass"',
                      "sheer adaptive glass",
                    ],
                    [
                      "frosted",
                      'material="frosted"',
                      'data-material="frosted"',
                      "milky, heavier blur",
                    ],
                    [
                      "crystal",
                      'material="crystal"',
                      'data-material="crystal"',
                      "bright specular gloss",
                    ],
                    [
                      "chakra",
                      'material="chakra"',
                      'data-material="chakra"',
                      "step-cut gem: all four edges faceted",
                    ],
                    [
                      "opaque",
                      'material="opaque"',
                      'data-material="opaque"',
                      "fully solid, no see-through",
                    ],
                  ].map(([m, prop, attr, look]) => (
                    <tr key={m}>
                      <td className="border border-foreground/15 px-3 py-2 font-semibold text-foreground">{m}</td>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>{prop}</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>{attr}</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">{look}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">The axes stack on top of whatever material you chose:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-foreground">
                    {[
                      "axis",
                      "prop",
                      "class",
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
                      "border",
                      'border / "rim" / "frame"',
                      "glass-border / -rim / -frame",
                      "material edge: hairline 1px (0.5px under frosted) · rim 2px · frame 4px",
                    ],
                    [
                      "veil",
                      "veil",
                      "glass-veil",
                      "alpha floor for read-through overlays: the default readability contract on menus, tooltips, toasts",
                    ],
                    [
                      "diffuse",
                      'diffuse / "stained"',
                      "glass-diffuse / -stained",
                      "blur floor (≥ 12px) for text-dense translucency; stained dyes the backdrop in the theme hue",
                    ],
                    [
                      "gradient",
                      "gradient",
                      "glass-gradient",
                      "brand-gradient accent wash",
                    ],
                    [
                      "glow",
                      'glow / glow="lg"',
                      "glass-glow / -lg",
                      "themed halo that tracks the tint hue",
                    ],
                    [
                      "sheen",
                      "sheen",
                      "glass-sheen",
                      "opt-in hover shimmer",
                    ],
                  ].map(([axis, prop, cls, what]) => (
                    <tr key={axis}>
                      <td className="border border-foreground/15 px-3 py-2 font-semibold text-foreground">{axis}</td>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>{prop}</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">
                        <IC>{cls}</IC>
                      </td>
                      <td className="border border-foreground/15 px-3 py-2">{what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">
              An explicit material <strong>pins</strong> that element under any page style. And because materials inherit, it also re-skins the
              adaptive glass nested inside it (a <IC>frosted</IC> dialog re-skins its own controls; pin a child back with its own material).
            </p>
          </CardContent>
        </Card>

        <Card id="tint" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">
              Glass tint: <IC>data-glass-tint</IC>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Recolor all glass in a subtree. Works on any element, not just <IC>&lt;html&gt;</IC>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Set <IC>data-glass-tint</IC> to a preset: on <IC>&lt;html&gt;</IC> for the whole app, or on any wrapper to tint just that section (it
              re-resolves per scope):
            </p>
            <Code>{`<html data-glass-tint="sapphire">        <!-- whole app -->

<section data-glass-tint="sistine">      <!-- just this panel -->
  <Card material="crystal">…</Card>
</section>`}</Code>
            <div>
              <h3 className="mb-2 font-semibold">Presets</h3>
              <p className="mb-2 text-muted-foreground">
                <strong>Jewels</strong> (single hue): selenite, rose, goldstone, carnelian, amber, moonstone, peridot, aventurine, turquoise,
                aquamarine, sapphire, lapis, amethyst, tourmaline.
              </p>
              <p className="mb-2 text-muted-foreground">
                <strong>Frescoes</strong> (multi-hue gradients): sistine, muse, aurora, gloaming.
              </p>
              <p className="text-muted-foreground">
                <strong>Status</strong>: info, success, warning, destructive. Used by Alert/Button, but settable on any element to tint it that status
                (e.g. <IC>data-glass-tint="info"</IC>).
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Custom color: OKLCH H · C · L</h3>
              <p className="mb-2 text-muted-foreground">
                For an arbitrary color, set the tint vars directly instead of a preset. The model is straight OKLCH: <strong>hue</strong> +{" "}
                <strong>chroma</strong> (the single &ldquo;how colorful&rdquo; dial: chroma <IC>0</IC> = neutral) + <strong>lightness</strong> (lower
                = deeper).
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

        <Card id="style" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">
              Glass material: the <IC>material</IC> prop &amp; <IC>data-glass</IC>
            </CardTitle>
            <CardDescription className="text-muted-foreground">Switch the material: glass, frosted, crystal, chakra, opaque.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Per component, pin a material with the <IC>material</IC> prop (on a bare element, use the <IC>data-material</IC> attribute):
            </p>
            <Code>{`<Card material="frosted">…</Card>
<Button material="crystal">…</Button>

<div className="glass glass-border" data-material="crystal">…</div>`}</Code>
            <p className="text-muted-foreground">
              Globally (or per subtree), set <IC>data-glass</IC> to re-skin every <em>adaptive</em> surface inside, the ones that left{" "}
              <IC>material</IC> off. A pinned material ignores it:
            </p>
            <Code>{`<html data-glass="frosted">              <!-- all adaptive glass = frosted -->
<section data-glass="crystal">…</section>  <!-- scoped -->`}</Code>
          </CardContent>
        </Card>

        <Card id="crystal" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">
              Crystal flavors: <IC>data-gloss</IC>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Swap the crystal gloss: a white specular, a theme tint, or an iridescent hue sweep.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Crystal&apos;s shine has three flavors, set with <IC>data-gloss</IC> on any ancestor (default / unset = <IC>tonal</IC>). It composes
              with <IC>material=&quot;crystal&quot;</IC> and the <IC>data-glass=&quot;crystal&quot;</IC> page style:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-foreground">
                    {[
                      "data-gloss",
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
                      "flat white specular: the classic glass shine",
                    ],
                    [
                      "tonal",
                      "a tonally-close tint of the theme (pearlescent): the default",
                    ],
                    [
                      "hue",
                      "iridescent: the highlight sweeps hues shifted ± around the tint",
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
            <Code>{`<html data-gloss="hue">                      <!-- iridescent crystal everywhere -->
<section data-gloss="white">…</section>     <!-- classic specular, scoped -->`}</Code>
            <p className="text-muted-foreground">Tune the gloss with these tokens: all have safe defaults, so override only what you want:</p>
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
                      "66",
                      "highlight lightness (→ %); lower = bolder",
                    ],
                    [
                      "--glass-gloss-tint",
                      "4.25",
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
                      "direction (±1): tonal streak / hue order",
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

        <Card id="surfaces" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Surfaces on raw elements</CardTitle>
            <CardDescription className="text-muted-foreground">
              Build a glass surface by hand: the structural class plus the axis classes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <IC>glass</IC> is the structural surface: sheerest, borderless. Everything else layers on top.
              </li>
              <li>
                <IC>glass-border</IC>: adds the material edge (a hairline; pair with <IC>glass-sm</IC> / <IC>glass-lg</IC> for the blur / elevation
                tier).
              </li>
              <li>
                <IC>glass-veil</IC>: a mostly-opaque, legible floor for read-through overlays (menus / tooltips).
              </li>
              <li>
                <IC>material=&quot;opaque&quot;</IC> (or <IC>data-material=&quot;opaque&quot;</IC>): fully solid, no see-through.
              </li>
            </ul>
            <p className="text-muted-foreground">
              On a component these are the <IC>border</IC> / <IC>veil</IC> and <IC>material</IC> props; on a bare element, apply the classes and the{" "}
              <IC>data-material</IC> attribute directly:
            </p>
            <Code>{`<div className="glass glass-border glass-veil rounded-xl p-4">Legible overlay</div>`}</Code>
          </CardContent>
        </Card>

        <Card id="text" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Readable text &amp; contrast</CardTitle>
            <CardDescription className="text-muted-foreground">
              Legible foreground without the harsh pure-black / pure-white spike: APCA contrast, banded to the ARC &ldquo;Bronze Simple Mode&rdquo;
              criterion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Contrast is a <strong>band</strong>, not a maximum: enough to read (floor), capped so it doesn&apos;t glare (ceiling). Each role maps to
              an APCA <IC>Lc</IC> band, and it all routes through <IC>readableForeground()</IC>, which aims for the band&apos;s target instead of
              maxing out.
            </p>

            <div>
              <h3 className="mb-2 font-semibold">Size tiers: the easy path</h3>
              <p className="mb-3 text-muted-foreground">
                Three foreground utilities, computed once by <IC>AutoForeground</IC> and tinted with the theme. Swap the class by text size: no JS per
                element:
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
                        "headings / large: eased off the spike",
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
                Icons are <strong>non-text</strong>, so the rule is <IC>Lc ≥ 45</IC> (the <IC>ui</IC> band, the APCA analog of WCAG&apos;s 3:1). A
                labeled icon just inherits <IC>currentColor</IC>; a <strong>standalone</strong> icon gets <IC>text-foreground-ui</IC>: the shipped
                icon foreground (ui band, target Lc 60) with an optional hue you can cycle from the{" "}
                <a className="underline underline-offset-2" href="/colors">
                  Colors
                </a>{" "}
                tester. Stroke weight is the dial: thin outlines need more contrast, bold / filled glyphs can go softer (Phosphor&apos;s{" "}
                <IC>weight</IC> prop).
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Off-theme surfaces</h3>
              <p className="mb-3 text-muted-foreground">
                For a surface that isn&apos;t the theme (a colored tool-call bubble, a status pill), band against <em>its</em> color. The hook is pure
                (no DOM read, memoized), so it scales to hundreds of them:
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
                <IC>complement()</IC> / <IC>harmony()</IC> derive accent hues off the theme color (oklch hue rotation, a balanced opposite, not the
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

        <Card id="harmonics" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Harmonic color tokens</CardTitle>
            <CardDescription className="text-muted-foreground">
              Color-wheel relationships derived from the theme hue. Pure CSS, no JS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Every relationship off the harmony anchor (<IC>--harmony-h</IC>: the content hue, or <IC>0</IC> for the hue-less selenite / moonstone
              themes) ships as a token, so they rotate with the tint automatically. The hue tokens are angles: use anywhere as{" "}
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
              Standalone icons (<IC>text-foreground-ui</IC>) can pin to any of these relationships, contrast-solved, from the{" "}
              <a className="underline underline-offset-2" href="/colors">
                Colors
              </a>{" "}
              tester.
            </p>
          </CardContent>
        </Card>

        {/* Live preview sits on the page background (one glass-veil card on the canvas) — not nested in a
            glass card — so its modeled Lc matches what ships. */}
        <section className="space-y-2 text-foreground">
          <h3 className="font-semibold">Foreground tier preview</h3>
          <ForegroundTester />
        </section>

        <Card id="tuning" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Tuning: CSS variables</CardTitle>
            <CardDescription className="text-muted-foreground">
              Fine dials, settable on <IC>&lt;html&gt;</IC> (global) or any element (scoped).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <IC>--glass-tint-h</IC>: tint <strong>hue</strong> (OKLCH H, 0–360).
              </li>
              <li>
                <IC>--glass-tint-c</IC>: tint <strong>chroma</strong>, the single &ldquo;how colorful&rdquo; master. It drives surfaces, text, and the
                harmonic accents together. <IC>0</IC> = neutral.
              </li>
              <li>
                <IC>--glass-opaque-l</IC>: tint <strong>body lightness</strong> (OKLCH L); lower = a deeper tint. Mode-aware default (90.9 light /
                36.4 dark), and the floor AutoForeground bands opaque-card text against.
              </li>
              <li>
                <IC>--glass-opacity</IC>: <strong>solidity floor</strong> for any glass element: <IC>0</IC> = the material&apos;s natural sheer glass,{" "}
                <IC>1</IC> = reads fully opaque. <strong>Defaults to 0.7</strong>. Set it with <IC>glassVars(&#123; opacity &#125;)</IC> (or inline).
              </li>
              <li>
                <IC>--glass-solid-a</IC>: how solid the <IC>glass-veil</IC> floor is (≈0.25–0.75; default 0.65).
              </li>
              <li>
                <IC>--glass-diffuse</IC>: the <IC>diffuse</IC> axis&apos; blur <strong>floor</strong> (default <IC>12px</IC>).
              </li>
              <li>
                <IC>--glass-stain-amount</IC>: how completely <IC>stained</IC> strips the backdrop&apos;s color (0–1; default <IC>1</IC>).
              </li>
              <li>
                <IC>--glass-opaque-outline</IC>: optional <strong>accent outline</strong> for opaque surfaces. Unset → the plain glass border; set it
                (e.g. <IC>var(--glass-accent)</IC>) on any ancestor to give every opaque component a colored edge. <IC>--glass-opaque-outline-w</IC>{" "}
                sets its weight (the switcher&apos;s hairline / rim / frame = 1 / 2 / 4px); an element-level <IC>border=&quot;rim&quot;</IC> /{" "}
                <IC>&quot;frame&quot;</IC> still wins.
              </li>
              <li>
                <IC>--glass-tint-a</IC>: the tint <strong>film</strong> alpha (per preset).
              </li>
            </ul>
            <p className="text-muted-foreground">
              These re-resolve per scope, so a scoped <IC>data-glass-tint</IC> or an inline var affects just that subtree:
            </p>
            <Code>{`<aside style={{ "--glass-solid-a": 0.8 }}>
  <div className="glass glass-veil …">extra-solid here only</div>
</aside>`}</Code>
          </CardContent>
        </Card>

        <Card id="optics" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Readability optics</CardTitle>
            <CardDescription className="text-muted-foreground">
              Three ways a translucent surface stays legible: <IC>veil</IC>, <IC>diffuse</IC>, <IC>stained</IC>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              <IC>veil</IC> is the default readability contract: an alpha floor under the text, free of any blur cost, and how menus, tooltips, and
              toasts ship. <IC>diffuse</IC> is the opt-in blur floor (≥ <IC>--glass-diffuse</IC>, 12px) for text-dense surfaces that must stay
              translucent: crystal keeps its 2px identity until a surface opts in, and opaque ignores it. <IC>diffuse=&quot;stained&quot;</IC> is the
              dyed mode: the backdrop collapses to pure luminance, and the glass&apos;s own tint supplies all the color.
            </p>
            <p className="text-muted-foreground">Drag the floor: the veiled card holds while plain glass rides the backdrop:</p>
            <VeilComparisonDemo />
            <p className="text-muted-foreground">Raise the blur floor: crystal stays crystal until the text needs it:</p>
            <DiffuseComparisonDemo />
            <p className="text-muted-foreground">Stain the glass: the backdrop re-renders as tonal shades of the theme:</p>
            <StainedComparisonDemo />
          </CardContent>
        </Card>

        <Card id="backgrounds" className="scroll-mt-24 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Backgrounds</CardTitle>
            <CardDescription className="text-muted-foreground">Theme- and tint-aware wallpapers: installable, and fresco-aware.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Two background styles ship in the registry and recolor with the live tint. A fresco preset lays its full multi-hue palette across them,
              not just one color:
            </p>
            <Code>{`npx shadcn@latest add @sistine/canvas-background    # animated canvas (gradient / lava / circle)
npx shadcn@latest add @sistine/gradient-background  # pure-CSS gradient wallpaper`}</Code>
            <p className="text-muted-foreground">
              Mount one at your app root as a <IC>fixed inset-0 -z-10</IC> element, and keep it out of any <IC>transform</IC> / <IC>filter</IC> /{" "}
              <IC>contain</IC> ancestor, or it gets clipped to that box instead of the viewport.
            </p>
            <p className="text-muted-foreground">
              <IC>&lt;GradientBackground&gt;</IC> paints as a <IC>linear</IC>, <IC>radial</IC>, or <IC>conic</IC> gradient via its <IC>shape</IC>{" "}
              prop, with <IC>angle</IC>, <IC>position</IC>, and (radial) <IC>radialShape</IC> / <IC>radialSize</IC> geometry, e.g.{" "}
              <IC>&lt;GradientBackground shape=&quot;conic&quot; position=&quot;30% 70%&quot; /&gt;</IC>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
