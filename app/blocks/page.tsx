"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

const blocks = [
  {
    name: "dashboard",
    title: "Dashboard",
    description: "Complete dashboard layout with stats, charts, and navigation",
    category: "Layout",
  },
  {
    name: "authentication",
    title: "Authentication",
    description: "Login form with glassmorphism effects",
    category: "Auth",
  },
  {
    name: "signup",
    title: "Sign Up",
    description: "Registration form with validation",
    category: "Auth",
  },
  {
    name: "forgot-password",
    title: "Forgot Password",
    description: "Password reset form",
    category: "Auth",
  },
  {
    name: "calendar",
    title: "Calendar",
    description: "Calendar view with events and scheduling",
    category: "Data Display",
  },
  {
    name: "chart",
    title: "Chart",
    description: "Beautiful charts with bar, line, and area visualizations",
    category: "Data Display",
  },
]

export default function BlocksPage() {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredBlocks = blocks.filter((block) =>
    block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div 
      className="min-h-screen transition-colors duration-300 relative"
    >
      <div className="container mx-auto px-4 pt-4 pb-16 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Blocks</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Pre-built page layouts and component compositions
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search blocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="glass"
              className="pl-10 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlocks.map((block) => (
            <Card key={block.name} variant="glass" className="h-full transition-all hover:scale-105 hover:shadow-lg text-foreground">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-foreground">{block.title}</CardTitle>
                  <Badge variant="glass">{block.category}</Badge>
                </div>
                <CardDescription className="text-muted-foreground">
                  {block.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/blocks/${block.name}`}>
                    View Block
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBlocks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No blocks found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}

