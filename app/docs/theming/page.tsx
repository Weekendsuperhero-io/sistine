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
                <strong>Jewels</strong> (single hue): neutral, rose, carnelian, amber, peridot, emerald, turquoise, aquamarine, sapphire, amethyst,
                tourmaline.
              </p>
              <p className="mb-2 text-muted-foreground">
                <strong>Frescoes</strong> (multi-hue gradients): sistine, muse, aurora, gloaming.
              </p>
              <p className="text-muted-foreground">
                <strong>Special</strong>: manila (warm bone / paper).
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
              <IC>glass</IC> and <IC>opaque</IC> are exposed as component <IC>variant</IC>s; for <IC>glass-surface</IC> / <IC>glass-solid</IC> apply
              the utility class directly:
            </p>
            <Code>{`<div className="glass-solid rounded-xl p-4">Legible overlay</div>`}</Code>
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
      </div>
    </div>
  );
}
