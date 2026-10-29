import type { Metadata } from "next";
import { MaterialComparison } from "@/components/material-comparison";

export const metadata: Metadata = {
  title: "Material comparison · Sistine",
  description: "Compare every stone and fresco across Glass, Frosted, Crystal, Lustre, Chakra, and Lucite in day and night mode.",
};

export default function ComparisonPage() {
  return (
    <div className="container mx-auto flex min-w-0 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-balance">Material comparison</h1>
        <p className="max-w-3xl text-muted-foreground text-pretty">
          Every stone and fresco, side by side across all six materials. The swatches follow the page theme and show your selected background through
          the glass.
        </p>
      </div>
      <MaterialComparison />
    </div>
  );
}
