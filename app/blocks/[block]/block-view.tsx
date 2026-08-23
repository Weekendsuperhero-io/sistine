"use client";

import { ArrowLeft, Check, Copy } from "@phosphor-icons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { blocks, REGISTRY_NAMES } from "./blocks";

/**
 * The interactive half of a block page. Split out of `page.tsx` because that file now has to be a
 * Server Component: Next rejects a page that exports BOTH "use client" and generateStaticParams, and
 * generateStaticParams is what `output: "export"` needs to enumerate these routes.
 *
 * Takes the slug as a plain string — the only thing that has to cross the server/client boundary. The
 * block's React component reference is looked up HERE, on the client, because a component type is not
 * serialisable as a prop.
 */
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <pre className="glass p-4 rounded-lg font-mono text-sm overflow-x-auto">
        <code className="text-foreground whitespace-pre">{code}</code>
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

export function BlockView({ block: blockName }: { block: string }) {
  const block = blocks[blockName as keyof typeof blocks];

  if (!block) {
    notFound();
  }

  const Component = block.component;
  const registryName = REGISTRY_NAMES[blockName] ?? blockName;

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-4 pt-8 pb-20 relative z-10">
        <div className="mb-8">
          <Link
            href="/blocks"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blocks
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-3">{block.title}</h1>
          <p className="text-lg text-muted-foreground">{block.description}</p>
        </div>

        <Tabs defaultValue="preview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="space-y-4">
            <Card className="text-foreground">
              <CardContent className="p-0">
                <div className="bg-background/50 backdrop-blur-sm rounded-lg">
                  <Component />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="code" className="space-y-4">
            <Card className="text-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Install</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Add this block and its component dependencies from the @sistine registry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock code={`npx shadcn@latest add @sistine/${registryName}`} />
              </CardContent>
            </Card>
            <Card className="text-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Usage</CardTitle>
                <CardDescription className="text-muted-foreground">Then use it in your project</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock code={block.code} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
