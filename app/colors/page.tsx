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
          <CardTitle>Readable text</CardTitle>
          <CardDescription>
            Text and icons drawn from the ramp above, banded for legibility (ARC Bronze) on the glass-solid surface — body / large / fine each take
            the swatch that hits its contrast target. Toggle Linear/Tonal and the solid opacity; tune the base color in the generator above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReadableTiersDemo />
        </CardContent>
      </Card>
    </div>
  );
}
