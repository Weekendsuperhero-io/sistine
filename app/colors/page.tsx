import { GradientSchemesDemo } from "@/components/gradient-schemes-demo";
import { OklchRampDemo } from "@/components/oklch-ramp-demo";
import { ReadableTiersDemo } from "@/components/readable-tiers-demo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "OKLCH ramps · Sistine",
  description: "Hue / chroma / lightness ramps, a gamut-safe tonal scale, and theme-derived, contrast-banded text colors.",
};

export default function ColorsPage() {
  return (
    <div className="container mx-auto flex flex-col items-center gap-8 px-4 py-12">
      <OklchRampDemo />
      <GradientSchemesDemo />
      <Card variant="glass" className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Foreground source</CardTitle>
          <CardDescription>
            Pick the foreground ramp — <strong>Tonal / Linear / Hue / Chroma</strong> — and it sets the site&apos;s text palette live (via
            AutoForeground), band-picked for legibility (ARC Bronze) on the glass-solid surface. Tune the base color in the generator above; Hue /
            Chroma are constant-lightness (see the note).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReadableTiersDemo
            live
            palettes={[
              "tonal",
              "lightness",
              "hue",
              "chroma",
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
