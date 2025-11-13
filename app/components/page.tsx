"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/ui/card"
import { Input } from "@/registry/ui/glass/input"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import { Search, BookOpen } from "lucide-react"
import { getComponents } from "@/lib/registry"
import { getStorybookUrl } from "@/lib/storybook-url"

const components = getComponents()

export default function ComponentsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredComponents = components.filter((component) =>
    component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    component.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    component.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div 
      className="min-h-screen transition-colors duration-300 relative"
    >
      <div className="container mx-auto px-4 pt-4 pb-16 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Components</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Browse our collection of {components.length} beautiful, glassy UI components
          </p>
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="glass"
              icon={<Search className="h-4 w-4 text-foreground/60" />}
              className="text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComponents.map((component) => (
            <Link
              key={component.name}
              href={`/docs/components/${component.name}`}
              className="group"
            >
              <Card variant="glass" className="h-full transition-all hover:scale-105 hover:shadow-lg text-foreground">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-foreground group-hover:text-foreground/80">
                      {component.title || component.name}
                    </CardTitle>
                    <Badge variant="glass">Component</Badge>
                  </div>
                  <CardDescription className="text-muted-foreground">
                    {component.description || "No description available"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={getStorybookUrl(component.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <BookOpen className="h-4 w-4" />
                        Storybook
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No components found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}

