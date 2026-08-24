"use client";

import { Check, Copy } from "@phosphor-icons/react";
import * as React from "react";
import { InstallationInstructions } from "@/components/installation-instructions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mcpCode = `{
  "mcpServers": {
    "sistine": {
      "command": "npx",
      "args": [
        "-y",
        "@shadcn/mcp-server",
        "--registry",
        "https://raw.githubusercontent.com/Weekendsuperhero-io/sistine/main/public/r/registry.json"
      ]
    }
  }
}`;

const registryConfig = `{
  "registries": {
    "@sistine": "https://raw.githubusercontent.com/Weekendsuperhero-io/sistine/main/public/r/{name}.json"
  }
}`;

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <pre className="glass p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
        <code className="text-foreground">{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={copyToClipboard}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function GettingStartedPage() {
  return (
    <div className="text-foreground">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Getting Started</h1>
        <p className="text-base sm:text-lg text-muted-foreground">Get up and running with Sistine in minutes</p>
      </div>

      <div className="space-y-8">
        <Card className="text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Installation</CardTitle>
            <CardDescription className="text-muted-foreground">Install Sistine components using the shadcn CLI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">1. Initialize your project</h3>
              <p className="text-muted-foreground mb-4">Make sure you have a Next.js project set up with Tailwind CSS configured.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">2. Add the Sistine registry</h3>
              <p className="text-muted-foreground mb-4">
                Add the <code className="bg-muted px-1 rounded">@sistine</code> namespace to your project&apos;s{" "}
                <code className="bg-muted px-1 rounded">components.json</code> once:
              </p>
              <CodeBlock code={registryConfig} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">3. Install components</h3>
              <p className="text-muted-foreground mb-4">
                Use the shadcn CLI to add components from the Sistine registry with your preferred package manager:
              </p>
              <InstallationInstructions componentName="button" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">4. Start building</h3>
              <p className="text-muted-foreground">Import and use components in your application. All components default to adaptive glass.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="text-foreground" id="mcp">
          <CardHeader>
            <CardTitle className="text-foreground">MCP (Model Context Protocol) Setup</CardTitle>
            <CardDescription className="text-muted-foreground">Configure MCP to use Sistine components with AI assistants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">What is MCP?</h3>
              <p className="text-muted-foreground mb-4">
                MCP allows AI assistants to access and use Sistine components directly. This enables seamless integration with tools like Claude,
                ChatGPT, and other MCP-compatible assistants.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Setup Instructions</h3>
              <p className="text-muted-foreground mb-4">
                Add the following configuration to your MCP settings file (usually <code className="bg-muted px-1 rounded">~/.config/mcp.json</code>{" "}
                or similar):
              </p>
              <CodeBlock code={mcpCode} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Usage</h3>
              <p className="text-muted-foreground">
                Once configured, you can ask your AI assistant to add Sistine components to your project, and it will automatically use the correct
                registry URL and component paths.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Basic Usage</CardTitle>
            <CardDescription className="text-muted-foreground">Example of using Sistine components</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="example" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="example">Example</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
              </TabsList>
              <TabsContent value="example" className="space-y-4">
                <div className="space-y-2">
                  <Button>Glass Button</Button>
                  <Button variant="outline">Outline Button</Button>
                </div>
                <Card className="text-foreground">
                  <CardHeader>
                    <CardTitle className="text-foreground">Glass Card</CardTitle>
                    <CardDescription className="text-muted-foreground">This is a card with glass effect</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Card content goes here</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="code">
                <CodeBlock
                  code={`import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function Example() {
  return (
    <div>
      {/* No material prop = adaptive glass, the default */}
      <Button>Glass Button</Button>
      <Card>
        <CardHeader>
          <CardTitle>Glass Card</CardTitle>
          <CardDescription>This is a card with glass effect</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
      </Card>
    </div>
  )
}`}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="text-foreground" id="glass-customization">
          <CardHeader>
            <CardTitle className="text-foreground">Customizing Glass Effects</CardTitle>
            <CardDescription className="text-muted-foreground">
              Override transparency, blur, and other glass properties globally or per-component
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Global CSS Variables</h3>
              <p className="text-muted-foreground mb-4">
                All Sistine components automatically use CSS variables for glass effects. You can override these in your global CSS file to change the
                appearance of all components at once. Changes take effect immediately.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-semibold text-foreground mb-2">Shared knobs (both modes)</h4>
                  <CodeBlock
                    code={`/* In your globals.css, after the Sistine theme import — defaults shown */
:root {
  /* Tint: hue + chroma (the "how colorful" master; 0 = neutral).
     Or set a preset: <html data-glass-tint="sapphire">. */
  --glass-tint-h: 250;
  --glass-tint-c: 0.018;

  /* Blur ladder (glass material; frosted/crystal pin their own) */
  --blur: 2px;          /* base glass */
  --blur-sm: 1px;       /* small controls */
  --blur-lg: 8px;       /* overlays */
  --blur-xl: 12px;      /* heaviest glass tier */
  --blur-frosted: 25px; /* the frosted material */

  /* Veil floor solidity — menus / tooltips / toasts (0–1) */
  --glass-solid-a: 0.65;
}`}
                  />
                </div>

                <div>
                  <h4 className="text-md font-semibold text-foreground mb-2">Mode knobs (light values on :root, dark twins on .dark)</h4>
                  <CodeBlock
                    code={`/* Single-number dials the engine composes per mode — defaults shown */
:root {
  --glass-sheet-a: 0.11;  /* glass sheet alpha (how much body) */
  --glass-border-a: 0.16; /* edge alpha */
  --glass-opaque-l: 88; /* opaque floor lightness */
}

.dark {
  --glass-sheet-a: 0.05;
  --glass-border-a: 0.15;
  --glass-opaque-l: 36.4;
}`}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Example: Custom Transparency & Blur</h3>
              <p className="text-muted-foreground mb-4">Heavier, milkier glass (or sheerer, barely-there glass) in a few dials:</p>
              <CodeBlock
                code={`/* Heavier, milkier glass */
:root {
  --blur: 6px;           /* base glass blur (default 2px) */
  --glass-sheet-a: 0.18; /* more body (default 0.11 / 0.05 dark) */
}

/* Sheerer, barely-there glass */
:root {
  --blur: 1px;
  --glass-sheet-a: 0.06;
}`}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">How It Works</h3>
              <p className="text-muted-foreground mb-2">Every glass surface is composed from these tokens:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>
                  The tint vars (<code className="bg-muted px-1 rounded">--glass-tint-h</code> / <code className="bg-muted px-1 rounded">-c</code>)
                  compose the surface sheet (<code className="bg-muted px-1 rounded">--glass-bg</code>, a gradient), the border color (
                  <code className="bg-muted px-1 rounded">--glass-border</code>), and the accents: one hue + chroma recolors everything
                </li>
                <li>
                  The material&apos;s <code className="bg-muted px-1 rounded">backdrop-filter</code> blurs at its ladder value (
                  <code className="bg-muted px-1 rounded">--blur</code> for base glass), raised to the{" "}
                  <code className="bg-muted px-1 rounded">diffuse</code> floor when a surface opts in
                </li>
                <li>
                  Shadows come from the <code className="bg-muted px-1 rounded">--glass-shadow</code> twins (mode-aware)
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Because components only reference tokens, changing a variable restyles everything at once, globally on{" "}
                <code className="bg-muted px-1 rounded">:root</code>, or scoped on any wrapper.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Per-Component Customization</h3>
              <p className="text-muted-foreground mb-4">
                To customize an individual component, use the <code className="bg-muted px-1 rounded">glassVars</code> helper from{" "}
                <code className="bg-muted px-1 rounded">@/lib/material</code>. It returns a <code className="bg-muted px-1 rounded">style</code>{" "}
                object of CSS custom properties (<code className="bg-muted px-1 rounded">tintH</code> →{" "}
                <code className="bg-muted px-1 rounded">--glass-tint-h</code>, <code className="bg-muted px-1 rounded">blur</code> →{" "}
                <code className="bg-muted px-1 rounded">--srf-blur</code>, <code className="bg-muted px-1 rounded">opacity</code> →{" "}
                <code className="bg-muted px-1 rounded">--glass-opacity</code>, …), so the overrides route through the token system and can&apos;t
                fight a material, page style, or the theme:
              </p>
              <CodeBlock
                code={`import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { glassVars } from "@/lib/material"

export function CustomGlassCard() {
  return (
    <Card style={glassVars({ tintH: 292, blur: 40, opacity: 0.3 })}>
      <CardHeader>
        <CardTitle>Custom Glass Card</CardTitle>
      </CardHeader>
      <CardContent>
        This card has custom glass properties that override the global defaults.
      </CardContent>
    </Card>
  )
}`}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Calibrated defaults</h3>
              <p className="text-muted-foreground mb-2">
                Tuned for restraint: enough blur and depth to read as glass, never so much that it fogs what is behind it:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>
                  <strong>Blur ladder:</strong> base glass 2px (sm 1px · lg 8px · xl 12px), frosted 25px, crystal 2px, opaque none
                </li>
                <li>
                  <strong>Sheet alpha:</strong> 0.11 light / 0.05 dark (<code className="bg-muted px-1 rounded">--glass-sheet-a</code>)
                </li>
                <li>Subtle borders and shadows for depth</li>
                <li>
                  Only the standard <code className="bg-muted px-1 rounded">backdrop-filter</code> is authored (no{" "}
                  <code className="bg-muted px-1 rounded">-webkit-</code> twins) and no <code className="bg-muted px-1 rounded">mix-blend-mode</code>{" "}
                  anywhere: the veil floor is free; blur cost scales with area × radius × motion
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                You can adjust these values to match your design needs while maintaining the glass aesthetic.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
