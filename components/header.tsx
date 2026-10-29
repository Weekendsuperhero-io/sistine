"use client";

import { GithubLogoIcon, ListIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import { BackgroundSwitcher } from "@/components/background-switcher";
import { GlassStyleSwitcher } from "@/components/glass-style-switcher";
import { GlassTintSwitcher } from "@/components/glass-tint-switcher";
import { ReadableText } from "@/components/readable-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Docs",
    href: "/docs",
  },
  {
    name: "Components",
    href: "/components",
  },
  {
    name: "Blocks",
    href: "/blocks",
  },
  {
    name: "Themes",
    href: "/themes",
  },
  {
    name: "Colors",
    href: "/colors",
  },
  {
    name: "Compare",
    href: "/comparison",
  },
];

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [starCount, setStarCount] = React.useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    // Fetch GitHub star count
    fetch("https://api.github.com/repos/Weekendsuperhero-io/sistine")
      .then((res) => res.json())
      .then((data) => {
        if (data.stargazers_count) {
          setStarCount(data.stargazers_count);
        }
      })
      .catch(() => {
        // Silently fail if API is unavailable
      });
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent">
      <div className="container mx-auto px-4 pt-4">
        <div className="glass glass-border grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl px-3 sm:px-4 2xl:grid-cols-[auto_minmax(0,1fr)_auto] 2xl:gap-x-6">
          <div className="flex min-h-16 min-w-0 items-center gap-4 xl:gap-6">
            <Link href="/" className="flex items-center gap-2">
              {mounted && (
                <Image
                  src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                  alt="Sistine"
                  width={32}
                  height={32}
                  className="h-6 w-6 md:h-8 md:w-8 rounded-md [outline:1px_solid_oklch(0%_0_0_/_0.1)] [outline-offset:-1px] dark:[outline:1px_solid_oklch(100%_0_0_/_0.1)]"
                  priority
                />
              )}
              {!mounted && <div className="h-6 w-6 md:h-8 md:w-8 bg-muted animate-pulse rounded" />}
              {/* Brand in the live accent — stays readable as the glass tint changes (the switcher is in this same header). */}
              <ReadableText accent="--primary" className="text-lg md:text-xl font-bold">
                Sistine
              </ReadableText>
            </Link>
            <nav className="hidden xl:flex items-center gap-4">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-foreground/80",
                    pathname?.startsWith(item.href) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex min-h-16 items-center gap-1 sm:gap-2 2xl:col-start-3">
            {starCount !== null && (
              <Link
                href="https://github.com/Weekendsuperhero-io/sistine"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center"
              >
                <Badge className="flex items-center gap-1.5 h-9 px-3">
                  <GithubLogoIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold tabular-nums">{starCount.toLocaleString()}</span>
                </Badge>
              </Link>
            )}
            <GlassStyleSwitcher />
            <GlassTintSwitcher />
            <ModeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Toggle menu">
                  <ListIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>Browse the Sistine demo site.</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-6 mt-8">
                  <div className="flex items-center gap-2 pb-4 border-b border-border">
                    {mounted && (
                      <Image
                        src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                        alt="Sistine"
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-md [outline:1px_solid_oklch(0%_0_0_/_0.1)] [outline-offset:-1px] dark:[outline:1px_solid_oklch(100%_0_0_/_0.1)]"
                      />
                    )}
                    {!mounted && <div className="h-8 w-8 bg-muted animate-pulse rounded" />}
                  </div>
                  <nav className="flex flex-col gap-4">
                    {navigation.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "text-base font-medium transition-colors hover:text-foreground/80 py-2",
                          pathname?.startsWith(item.href) ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                  {starCount !== null && (
                    <div className="pt-4 border-t border-border">
                      <Link
                        href="https://github.com/Weekendsuperhero-io/sistine"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center"
                      >
                        <Badge className="flex items-center gap-1.5 h-9 px-3">
                          <GithubLogoIcon className="h-4 w-4" />
                          <span className="text-xs font-semibold tabular-nums">{starCount.toLocaleString()}</span>
                        </Badge>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="col-span-2 min-w-0 overflow-x-auto border-t border-border py-2 2xl:col-span-1 2xl:col-start-2 2xl:row-start-1 2xl:border-0 2xl:py-0">
            <BackgroundSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
