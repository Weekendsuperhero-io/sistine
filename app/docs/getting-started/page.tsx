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
      <pre className="glass-bg p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
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
        <Card variant="glass" className="text-foreground">
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
              <p className="text-muted-foreground">Import and use components in your application. All components default to glass variants.</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="text-foreground" id="mcp">
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

        <Card variant="glass" className="text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Basic Usage</CardTitle>
            <CardDescription className="text-muted-foreground">Example of using Sistine components</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="example" className="w-full">
              <TabsList variant="glass" className="mb-4">
                <TabsTrigger value="example">Example</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
              </TabsList>
              <TabsContent value="example" className="space-y-4">
                <div className="space-y-2">
                  <Button variant="glass">Glass Button</Button>
                  <Button variant="outline">Outline Button</Button>
                </div>
                <Card variant="glass" className="text-foreground">
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
      <Button variant="glass">Glass Button</Button>
      <Card variant="glass">
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

        <Card variant="glass" className="text-foreground" id="glass-customization">
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
                  <h4 className="text-md font-semibold text-foreground mb-2">Light Mode Variables</h4>
                  <CodeBlock
                    code={`/* In your globals.css or main CSS file */
:root {
  /* Glass background transparency (0-1) */
  --glass-bg: oklch(100% 0 0 / 0.25);

  /* Glass border color and opacity */
  --glass-border: oklch(100% 0 0 / 0.18);

  /* Blur amount - Apple standard is 30px */
  --blur: 30px;
  --blur-sm: 15px;  /* Small blur for subtle effects */
  --blur-lg: 50px;  /* Large blur for strong effects */

  /* Glass shadows */
  --glass-shadow: 0 8px 32px oklch(0% 0 0 / 0.1), 0 2px 8px oklch(0% 0 0 / 0.06);
  --glass-shadow-lg: 0 12px 48px oklch(0% 0 0 / 0.15), 0 4px 16px oklch(0% 0 0 / 0.1);
  --glass-shadow-sm: 0 4px 16px oklch(0% 0 0 / 0.08), 0 1px 4px oklch(0% 0 0 / 0.04);
}`}
                  />
                </div>

                <div>
                  <h4 className="text-md font-semibold text-foreground mb-2">Dark Mode Variables</h4>
                  <CodeBlock
                    code={`/* Dark mode overrides */
.dark {
  /* More transparent for dark backgrounds */
  --glass-bg: oklch(100% 0 0 / 0.1);
  --glass-border: oklch(100% 0 0 / 0.2);

  /* Same blur values work for both modes */
  --blur: 30px;
  --blur-sm: 15px;
  --blur-lg: 50px;

  /* Deeper shadows for dark mode */
  --glass-shadow: 0 8px 32px oklch(0% 0 0 / 0.4), 0 2px 8px oklch(0% 0 0 / 0.2);
  --glass-shadow-lg: 0 12px 48px oklch(0% 0 0 / 0.5), 0 4px 16px oklch(0% 0 0 / 0.3);
  --glass-shadow-sm: 0 4px 16px oklch(0% 0 0 / 0.3), 0 1px 4px oklch(0% 0 0 / 0.15);
}`}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Example: Custom Transparency & Blur</h3>
              <p className="text-muted-foreground mb-4">
                Here&apos;s an example of customizing the glass effect to be more or less transparent with different blur amounts:
              </p>
              <CodeBlock
                code={`/* More transparent, stronger blur */
:root {
  --glass-bg: oklch(100% 0 0 / 0.15);  /* 15% opacity - more transparent */
  --blur: 40px;                          /* Stronger blur */
}

.dark {
  --glass-bg: oklch(100% 0 0 / 0.08);  /* 8% opacity for dark mode */
  --blur: 40px;
}

/* Less transparent, subtle blur */
:root {
  --glass-bg: oklch(100% 0 0 / 0.4);   /* 40% opacity - less transparent */
  --blur: 20px;                          /* Subtle blur */
}

.dark {
  --glass-bg: oklch(100% 0 0 / 0.15);  /* 15% opacity for dark mode */
  --blur: 20px;
}`}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">How It Works</h3>
              <p className="text-muted-foreground mb-2">All Sistine components with glass variants automatically use these CSS variables:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>
                  Components read <code className="bg-muted px-1 rounded">--glass-bg</code> for background color
                </li>
                <li>
                  Components use <code className="bg-muted px-1 rounded">backdrop-blur-[var(--blur)]</code> for blur effect
                </li>
                <li>
                  Borders use <code className="bg-muted px-1 rounded">--glass-border</code> for color
                </li>
                <li>
                  Shadows use <code className="bg-muted px-1 rounded">--glass-shadow</code> variables
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                When you change these variables, all components with glass effects will automatically update without needing to modify individual
                component code.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Per-Component Customization</h3>
              <p className="text-muted-foreground mb-4">
                You can also customize glass effects for individual components using the <code className="bg-muted px-1 rounded">glass</code> prop:
              </p>
              <CodeBlock
                code={`import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function CustomGlassCard() {
  return (
    <Card
      variant="glass"
      glass={{
        color: "oklch(60.5631% 0.218915 292.717225 / 0.2)",  // Purple tint
        blur: 40,                                              // 40px blur
        transparency: 0.3,                                     // 30% opacity
        outline: "oklch(60.5631% 0.218915 292.717225 / 0.5)",  // Purple border
      }}
    >
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
              <h3 className="text-lg font-semibold text-foreground mb-2">Apple Standards</h3>
              <p className="text-muted-foreground mb-2">Sistine uses Apple&apos;s glassmorphism standards by default:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>
                  <strong>Light Mode:</strong> 25% opacity, 30px blur
                </li>
                <li>
                  <strong>Dark Mode:</strong> 10% opacity, 30px blur
                </li>
                <li>Subtle borders and shadows for depth</li>
                <li>Consistent blur values across all components</li>
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
