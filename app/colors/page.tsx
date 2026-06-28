import { GradientSchemesDemo } from "@/components/gradient-schemes-demo";
import { OklchRampDemo } from "@/components/oklch-ramp-demo";
import { ReadableTiersDemo } from "@/components/readable-tiers-demo";

export const metadata = {
  title: "OKLCH ramps · Sistine",
  description: "Hue / chroma / lightness ramps, a gamut-safe tonal scale, and theme-derived, contrast-banded text colors.",
};

export default function ColorsPage() {
  return (
    <div className="container mx-auto flex flex-col items-center gap-8 px-4 py-12">
      <OklchRampDemo />
      <GradientSchemesDemo />
      {/* No glass card wrapper on purpose: the preview panel must sit DIRECTLY on the page background
          (one glass-solid card on the canvas) so its modeled Lc matches what ships — not a card
          blurring another card. */}
      <section className="w-full max-w-3xl space-y-4">
        <div className="space-y-1.5">
          <h2 className="font-semibold text-lg">Foreground source</h2>
          <p className="text-sm text-muted-foreground">
            Pick the foreground ramp — <strong>Tonal / Linear / Hue / Chroma</strong> — and it sets the site&apos;s text palette live (via
            AutoForeground), band-picked for legibility (ARC Bronze). The panel below is a{" "}
            <strong>single glass-solid card on the page background</strong> — the real surface text sits on — so its Lc matches production. Tune the
            base color in the generator above; Hue / Chroma are constant-lightness (see the note).
          </p>
        </div>
        <ReadableTiersDemo
          live
          palettes={[
            "tonal",
            "lightness",
            "hue",
            "chroma",
          ]}
        />
      </section>
    </div>
  );
}
