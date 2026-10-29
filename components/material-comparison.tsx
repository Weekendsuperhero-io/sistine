import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GLASS_TINT_PRESETS } from "@/lib/glass-presets";
import { MATERIALS } from "@/lib/material";

export function MaterialComparison() {
  return (
    <section aria-label="Full palette comparison" className="flex min-w-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {GLASS_TINT_PRESETS.length} colors · {MATERIALS.length} materials · {GLASS_TINT_PRESETS.length * MATERIALS.length} swatches
      </p>
      <ComparisonGrid />
      <p className="text-sm text-muted-foreground">
        Use the page controls to compare materials against your selected background. Selenite stays neutral; Onyx stays dark in either mode.
      </p>
    </section>
  );
}

function ComparisonGrid() {
  return (
    <div className="p-3">
      <div
        role="region"
        aria-label="Colors and materials; scroll sideways on smaller screens"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll to offscreen columns.
        tabIndex={0}
        className="overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
      >
        <table className="w-full min-w-[64rem] border-separate border-spacing-3 text-sm">
          <caption className="sr-only">All named colors across six materials, using the page’s current theme and background.</caption>
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-left font-medium">
                Color
              </th>
              {MATERIALS.map((material) => (
                <th key={material} scope="col" className="pb-2 text-left font-medium capitalize">
                  {material}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GLASS_TINT_PRESETS.map((preset) => (
              <tr key={preset.value}>
                <th scope="row" className="pr-2 text-left font-medium">
                  {preset.label}
                </th>
                {MATERIALS.map((material) => (
                  <td key={material} className="w-[15%] p-0">
                    <Card material={material} border data-glass-tint={preset.value} className="min-h-28 gap-2 py-4">
                      <CardHeader className="gap-2 px-3">
                        <CardTitle>{preset.label}</CardTitle>
                        <CardDescription>Body text on glass</CardDescription>
                      </CardHeader>
                    </Card>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
