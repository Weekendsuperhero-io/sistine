import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const STONES = [
  {
    tint: "aquamarine",
    name: "Aquamarine",
    detail: "Cool reflections over a deep blue body.",
  },
  {
    tint: "tourmaline",
    name: "Tourmaline",
    detail: "A rose-tinted reflection and a soft halo.",
  },
  {
    tint: "amber",
    name: "Amber",
    detail: "Warm, polished glass that catches the light.",
  },
  {
    tint: "onyx",
    name: "Onyx",
    detail: "Near-black glass with a quiet silver reflection.",
  },
] as const;

export function LustreComparisonDemo() {
  return (
    <section className="flex w-full max-w-5xl flex-col gap-4" aria-labelledby="lustre-heading">
      <div className="flex flex-col gap-1.5">
        <h2 id="lustre-heading" className="text-lg font-semibold">
          Lustre glass
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          A polished body, a diagonal reflection, and a soft halo. Switch the page mode to see the lighter finish; Onyx stays deep in either mode.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STONES.map((stone) => (
          <Card key={stone.tint} material="lustre" border data-glass-tint={stone.tint}>
            <CardHeader>
              <CardTitle>{stone.name}</CardTitle>
              <CardDescription>Polished glass</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-pretty">{stone.detail}</p>
            </CardContent>
            <CardFooter>
              <code className="text-xs text-muted-foreground">material=&quot;lustre&quot;</code>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Button asChild variant="outline" className="self-start">
        <Link href="/comparison">Compare all colors and materials</Link>
      </Button>
    </section>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
