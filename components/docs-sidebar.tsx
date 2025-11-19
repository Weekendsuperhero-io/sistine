"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getComponents } from "@/lib/registry"
import { Card, CardContent } from "@/components/ui/card"

const components = getComponents()

const docsNav = [
  {
    title: "Getting Started",
    items: [
      { title: "Installation", href: "/docs/getting-started" },
      { title: "MCP Setup", href: "/docs/getting-started#mcp" },
      { title: "Glass Customization", href: "/docs/getting-started#glass-customization" },
    ],
  },
  {
    title: "Components",
    items: components.map((comp) => ({
      title: comp.title || comp.name,
      href: `/docs/components/${comp.name}`,
    })),
  },
]

export function DocsSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="w-full md:w-64">
      <Card variant="glass" className="sticky top-[5rem] h-[calc(100vh-7rem)] md:h-[calc(100vh-7rem)] flex flex-col border-0 md:border">
        <CardContent className="p-4 md:p-6 overflow-y-auto flex-1">
          <nav className="space-y-6">
            {docsNav.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{section.title}</h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onLinkClick}
                          className={cn(
                            "flex items-center gap-2 text-sm transition-colors hover:text-foreground rounded-md px-2 py-1.5",
                            isActive
                              ? "text-foreground font-medium bg-accent"
                              : "text-muted-foreground hover:bg-accent/50"
                          )}
                        >
                          {isActive && <ChevronRight className="h-4 w-4" />}
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </CardContent>
      </Card>
    </aside>
  )
}

