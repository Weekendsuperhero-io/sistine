"use client";

import { CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getUiComponents, getUtilities } from "@/lib/registry";
import { cn } from "@/lib/utils";

const components = getUiComponents();
const utilities = getUtilities();

type NavItem = {
  title: string;
  href: string;
};

const docsNav = [
  {
    title: "Getting Started",
    items: [
      {
        title: "Installation",
        href: "/docs/getting-started",
      },
      {
        title: "MCP Setup",
        href: "/docs/getting-started#mcp",
      },
      {
        title: "Glass Customization",
        href: "/docs/getting-started#glass-customization",
      },
    ] as NavItem[],
  },
  {
    title: "Theming",
    items: [
      {
        title: "Mental model",
        href: "/docs/theming",
      },
      {
        title: "Glass Tint",
        href: "/docs/theming#tint",
      },
      {
        title: "Glass Style",
        href: "/docs/theming#style",
      },
      {
        title: "Crystal Flavors",
        href: "/docs/theming#crystal",
      },
      {
        title: "Surface Tiers",
        href: "/docs/theming#surfaces",
      },
      {
        title: "Readable Text",
        href: "/docs/theming#text",
      },
      {
        title: "Harmonic Color",
        href: "/docs/theming#harmonics",
      },
      {
        title: "Tuning",
        href: "/docs/theming#tuning",
      },
      {
        title: "Backgrounds",
        href: "/docs/theming#backgrounds",
      },
    ] as NavItem[],
  },
  {
    title: "Components",
    items: components.map((comp) => ({
      title: comp.title || comp.name,
      href: `/docs/components/${comp.name}`,
    })) as NavItem[],
  },
  {
    // Theme utilities and effects (AutoForeground, the backgrounds, …): in the registry, not UI components.
    title: "Utilities",
    items: utilities.map((item) => ({
      title: item.title || item.name,
      href: `/docs/components/${item.name}`,
    })) as NavItem[],
  },
];

export function DocsSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64">
      <Card className="sticky top-[5rem] h-[calc(100vh-7rem)] md:h-[calc(100vh-7rem)] flex flex-col">
        <CardContent className="p-4 md:p-6 overflow-y-auto flex-1">
          <nav className="space-y-6">
            {docsNav.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{section.title}</h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onLinkClick}
                          className={cn(
                            "flex items-center gap-2 text-sm transition-colors hover:text-foreground rounded-md px-2 py-1.5",
                            isActive ? "text-foreground font-medium bg-foreground/10" : "text-muted-foreground hover:bg-foreground/5",
                          )}
                        >
                          {isActive && <CaretRightIcon className="h-4 w-4 text-foreground-ui" />}
                          <span className="truncate flex-1">{item.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </CardContent>
      </Card>
    </aside>
  );
}
