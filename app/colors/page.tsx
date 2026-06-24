import { ForegroundTester } from "@/components/foreground-tester";
import { GradientSchemesDemo } from "@/components/gradient-schemes-demo";
import { OklchRampDemo } from "@/components/oklch-ramp-demo";

export const metadata = {
  title: "OKLCH ramps · Sistine",
  description: "Hue / chroma / lightness ramps, a gamut-safe tonal scale, and a configurable theme-derived foreground.",
};

export default function ColorsPage() {
  return (
    <div className="container mx-auto flex flex-col items-center gap-8 px-4 py-12">
      <OklchRampDemo />
      <GradientSchemesDemo />
      <ForegroundTester />
    </div>
  );
}
