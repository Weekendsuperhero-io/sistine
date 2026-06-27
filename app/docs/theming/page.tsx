import type { ReactNode } from "react";
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
        <h1 className="mb-4 font-bold text-2xl text-foreground sm:text-3xl md:text-4xl">Theming</h1>
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
                <strong>Material</strong> (the look): <IC>glass</IC> · <IC>frosted</IC> · <IC>fluted</IC> · <IC>crystal</IC>. Set with{" "}
                <IC>data-glass</IC> on an ancestor (or the <IC>variant</IC> shortcut).
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
                    "fluted",
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
              <strong>Shortcut:</strong> <IC>variant=&quot;frosted&quot;</IC> / <IC>&quot;fluted&quot;</IC> / <IC>&quot;crystal&quot;</IC> jumps to
              that material at its own (sheer) default tier — use the full <IC>data-glass</IC> × <IC>variant</IC> form only to put a material at a
              different tier. <IC>opaque</IC> is the solid endpoint: a surface is solid regardless of material.
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
              <h3 className="mb-2 font-semibold">Custom hue</h3>
              <p className="mb-2 text-muted-foreground">For an arbitrary color, set the tint vars directly instead of a preset:</p>
              <Code>{`<div
  style={{
    "--glass-tint-h": 280,   /* hue 0–360 */
    "--glass-tint-c": 0.07,  /* chroma / saturation */
    "--glass-tint-a": 0.16,  /* wash strength 0–~0.3 */
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
            <CardDescription className="text-muted-foreground">Switch the glass material: glass, frosted, fluted, crystal, opaque.</CardDescription>
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
<small className="text-foreground-strong">Fine print</small>`}</Code>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Icons</h3>
              <p className="text-muted-foreground">
                Icons are <strong>non-text</strong>, so the rule is <IC>Lc ≥ 45</IC> (the <IC>ui</IC> band — the APCA analog of WCAG&apos;s 3:1). A
                labeled icon just inherits <IC>currentColor</IC>; a standalone meaningful icon has to stand on its own. Stroke weight is the dial —
                thin outlines need more contrast, bold / filled glyphs can go softer (use Phosphor&apos;s <IC>weight</IC> prop).
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
                <IC>--glass-tint-a</IC> — wash strength: how much the tint floods sheer surfaces (<IC>glass-bg</IC> / <IC>surface</IC>). 0 = no wash.
                Has little effect on <IC>opaque</IC> (use <IC>--glass-tint-c</IC> / <IC>-h</IC> there).
              </li>
              <li>
                <IC>--glass-tint-c</IC> — saturation (chroma) of the tint.
              </li>
              <li>
                <IC>--glass-solid-a</IC> — how solid the <IC>glass-solid</IC> floor is (≈0.25–0.75; default 0.65).
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
