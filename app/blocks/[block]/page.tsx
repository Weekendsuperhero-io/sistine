import { BlockView } from "./block-view";
import { blocks } from "./blocks";

/**
 * Server shell for a block route. Everything interactive lives in `block-view.tsx`; this file exists
 * so `generateStaticParams` has somewhere to be. Next refuses a page that exports both "use client"
 * and generateStaticParams, and `output: "export"` cannot prerender a dynamic segment without it.
 *
 * Slugs come from the catalogue itself, so adding a block to `blocks.tsx` is all it takes to get its
 * static route.
 */
export function generateStaticParams() {
  return Object.keys(blocks).map((block) => ({
    block,
  }));
}

export default async function BlockPage({
  params,
}: {
  params: Promise<{
    block: string;
  }>;
}) {
  const { block } = await params;
  return <BlockView block={block} />;
}
