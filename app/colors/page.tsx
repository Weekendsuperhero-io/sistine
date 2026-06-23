import { OklchRampDemo } from "@/components/oklch-ramp-demo";

export const metadata = {
  title: "OKLCH ramps · Sistine",
  description: "Generate symmetric hue and chroma ramps from any oklch base color.",
};

export default function ColorsPage() {
  return (
    <div className="container mx-auto flex justify-center px-4 py-12">
      <OklchRampDemo />
    </div>
  );
}
