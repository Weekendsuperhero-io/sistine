import { getComponents } from "@/lib/registry";
import { ComponentView } from "./component-view";

/**
 * Server shell for a component doc route. Everything interactive lives in `component-view.tsx`; this
 * file exists so `generateStaticParams` has somewhere to be. Next refuses a page that exports both
 * "use client" and generateStaticParams, and `output: "export"` cannot prerender a dynamic segment
 * without it.
 *
 * Slugs come from the registry itself, the same source `/rss.xml` and the view's own lookup use, so a
 * component added to `registry.json` gets its static route with no list to keep in sync.
 */
export function generateStaticParams() {
  return getComponents().map((c) => ({
    component: c.name,
  }));
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{
    component: string;
  }>;
}) {
  const { component } = await params;
  return <ComponentView component={component} />;
}
