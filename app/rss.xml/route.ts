import type { NextRequest } from "next/server";
import { getComponents } from "@/lib/registry";

export const revalidate = 3600;

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

/**
 * RSS feed of the Sistine component registry — one item per @sistine component, generated natively
 * from the local registry (no third-party SDK). Served at /rss.xml.
 */
export async function GET(request: NextRequest) {
  const baseUrl = new URL(request.url).origin;

  const items = getComponents()
    .map((c) => {
      const url = `${baseUrl}/docs/components/${c.name}`;
      return `    <item>
      <title>${escapeXml(c.title || c.name)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(c.description || "")}</description>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>@sistine</title>
    <description>New and updated components in the Sistine glass registry</description>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
