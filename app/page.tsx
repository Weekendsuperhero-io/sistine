"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/registry/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/ui/card"
import { Badge } from "@/registry/ui/badge"
import { Sparkles, ArrowRight, Zap, Palette, Code, Blocks } from "lucide-react"
export default function Home() {
  return (
    <div
      className="min-h-screen transition-colors duration-300 relative"
    >
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-4 pb-24 md:pb-32 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="h-12 w-12 text-foreground" />
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-foreground">
              Glass UI
            </h1>
          </div>
          <p className="text-2xl md:text-3xl text-foreground/90 mb-6 max-w-3xl mx-auto">
            A modern, glassy component library inspired by Apple&apos;s design language
          </p>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Beautiful, accessible components built with React, TypeScript, and Tailwind CSS.
            All components default to stunning glassmorphism effects.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button asChild size="lg" variant="glass">
              <Link href="/docs/getting-started">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/components">
                View Components
              </Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="glass" className="text-foreground">
              <CardHeader>
                <Zap className="h-8 w-8 mb-2 text-foreground" />
                <CardTitle className="text-foreground">Glassmorphism</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Every component features beautiful glass effects by default, inspired by Apple&apos;s design language.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card variant="glass" className="text-foreground">
              <CardHeader>
                <Code className="h-8 w-8 mb-2 text-foreground" />
                <CardTitle className="text-foreground">TypeScript</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Built with TypeScript for type safety and better developer experience.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card variant="glass" className="text-foreground">
              <CardHeader>
                <Palette className="h-8 w-8 mb-2 text-foreground" />
                <CardTitle className="text-foreground">Customizable</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Fully customizable glass effects with color, transparency, blur, and outline controls.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card variant="glass" className="text-foreground">
              <CardHeader>
                <Blocks className="h-8 w-8 mb-2 text-foreground" />
                <CardTitle className="text-foreground">40+ Components</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Comprehensive collection of UI components ready to use in your projects.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Component Preview Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Beautiful Components</h2>
            <p className="text-lg text-muted-foreground">
              Explore our collection of glassy UI components
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card variant="glass" className="text-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Buttons</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Multiple variants with glass effects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="glass" size="sm">Glass</Button>
                  <Button variant="outline" size="sm">Outline</Button>
                  <Button variant="ghost" size="sm">Ghost</Button>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass" className="text-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Cards</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Glassy card components with variants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="glass">Glass Badge</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass" className="text-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Forms</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Input fields with glass effects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Glass input..."
                    className="w-full px-3 py-2 rounded-md glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="text-center">
            <Button asChild variant="glass" size="lg">
              <Link href="/components">
                View All Components
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <Card variant="glass" className="text-center text-foreground max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl text-foreground mb-4">Ready to get started?</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Start building beautiful interfaces with Glass UI today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button asChild variant="glass" size="lg">
                  <Link href="/docs/getting-started">
                    Documentation
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="https://github.com/crenspire/glass-ui">
                    View on GitHub
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
